import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { api, AuthError } from '../lib/api.js'
import { subscribeLocalExtension } from '../lib/extBridge.js'
import { useToast } from './ToastProvider.jsx'

// ─────────────────────────────────────────────────────────────────────────────
//  AppStore — the authenticated app's shared state:
//    • me           : { user, expiresAt, secondsLeft }  (+ live countdown)
//    • jobs         : kept live by an SSE stream (init / job:update / job:delete)
//    • profiles     : polled every 8s (extension/LinkedIn connection status)
//    • uiConfig     : { hideLogs, hideSettings }
//  …plus action wrappers that funnel every 401 to a single logout path.
// ─────────────────────────────────────────────────────────────────────────────

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

// Enrich job statuses that count as FINISHED (stop polling, release the Run lock).
const ENRICH_TERMINAL = ['done', 'completed', 'failed', 'error', 'stopped', 'paused', 'cancelled']
// In-flight enrich statuses — while one holds, this job's scrape Run is disabled.
export const ENRICH_ACTIVE = ['uploading', 'queued', 'running', 'processing', 'started']

// Persist scrapeJobId → enrichJobId so a page reload RESUMES the live enrich view
// (and prevents an accidental double-charge re-run of an already-running job).
const ENRICH_REFS_KEY = 'vk_enrich_jobs'
function readEnrichRefs() {
  try { return JSON.parse(localStorage.getItem(ENRICH_REFS_KEY) || '{}') || {} } catch { return {} }
}
function persistEnrichRef(jobId, enrichJobId) {
  try {
    const m = readEnrichRefs()
    if (enrichJobId) m[jobId] = enrichJobId
    else delete m[jobId]
    localStorage.setItem(ENRICH_REFS_KEY, JSON.stringify(m))
  } catch { /* quota */ }
}

export function AppProvider({ initialMe, onLogout, children }) {
  const toast = useToast()
  const [me, setMe] = useState(initialMe)
  const [jobs, setJobs] = useState([])
  const [profiles, setProfiles] = useState([])
  const [activeProfileId, setActiveProfileId] = useState(null)
  const [connectorOnline, setConnectorOnline] = useState(false)
  const [usage, setUsage] = useState({ limit: 0, used: 0, resetsDaily: false }) // scrape cap (paid resets daily; free = hard total)
  const [credits, setCredits] = useState(() => initialMe?.user?.credits ?? 0) // pay-per-use wallet (enrich / verify / domain)
  const [uiConfig, setUiConfig] = useState({ hideLogs: false, hideSettings: false })
  // THIS browser's extension state, reported by the extension's dashboard
  // bridge. installed=false until a message arrives (extension missing OR a
  // pre-bridge version) — treat as "unknown", not "not installed".
  const [localExt, setLocalExt] = useState({
    installed: false, connected: false, hasKey: false,
    profileId: '', profileName: '', authError: '',
  })
  // Per-scrape-job enrich state, keyed by job id. Kept OUT of the `jobs` array
  // because SSE replaces job objects wholesale on every job:update (which would
  // wipe it). The enricher has no SSE → we poll Core for live counts.
  // Hydrate from persisted refs in the initializer so a reload shows the active
  // "Enriching…" state from the FIRST frame — no flash of the idle "Enrich N" button
  // before the resume poll (below) kicks in. The poll then fills in live counts.
  const [enrichByJob, setEnrichByJob] = useState(() => {
    const out = {}
    for (const [jobId, enrichJobId] of Object.entries(readEnrichRefs())) {
      if (enrichJobId) out[jobId] = { status: 'queued', enrichJobId }
    }
    return out
  })
  const enrichTimers = useRef({}) // jobId -> setInterval handle
  const enrichErrs = useRef({})   // jobId -> consecutive poll-error count

  // Run an API call; a 401 anywhere → single logout. Other errors propagate so
  // the calling component can toast a useful message.
  const guarded = useCallback(
    async (fn) => {
      try {
        return await fn()
      } catch (e) {
        if (e instanceof AuthError) {
          onLogout()
          return undefined
        }
        throw e
      }
    },
    [onLogout],
  )

  // ── SSE: live jobs ─────────────────────────────────────────────────────
  useEffect(() => {
    let es
    let closed = false
    let retry

    const connect = () => {
      es = api.events()
      es.addEventListener('init', (ev) => {
        try {
          setJobs(JSON.parse(ev.data) || [])
        } catch {
          /* ignore */
        }
      })
      es.addEventListener('job:update', (ev) => {
        try {
          const d = JSON.parse(ev.data)
          setJobs((prev) => {
            const i = prev.findIndex((j) => j.id === d.id)
            if (i >= 0) {
              const next = prev.slice()
              next[i] = d
              return next
            }
            return [d, ...prev]
          })
        } catch {
          /* ignore */
        }
      })
      es.addEventListener('job:delete', (ev) => {
        try {
          const { id } = JSON.parse(ev.data)
          setJobs((prev) => prev.filter((j) => j.id !== id))
        } catch {
          /* ignore */
        }
      })
      // Only reconnect once fully CLOSED (token rejected / server closed it).
      // On a transient drop EventSource auto-reconnects itself.
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED && !closed) {
          retry = setTimeout(connect, 3000)
        }
      }
    }

    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      if (es) es.close()
    }
  }, [])

  // ── profiles + extension status (poll, focus-refresh) ──────────────────
  const refreshProfiles = useCallback(async () => {
    try {
      const d = await api.agentStatus()
      setProfiles(Array.isArray(d.profiles) ? d.profiles : [])
      setActiveProfileId(d.activeProfileId || null)
      setConnectorOnline(!!d.connectorOnline)
      setUsage({ limit: d.scrapeLimit ?? 0, used: d.scrapedToday ?? 0, resetsDaily: !!d.scrapeResetsDaily })
      // NOTE: credits are NOT taken from agentStatus — the scraper's value can lag
      // behind Core's live wallet and made the pill flicker between the persisted
      // total and the live remaining. The credit pill is driven solely by Core's
      // live balance below (refreshCredits) + the per-job enrich poller.
    } catch (e) {
      if (e instanceof AuthError) onLogout()
      // network blip → keep last-known cache
    }
  }, [onLogout])

  useEffect(() => {
    refreshProfiles()
    const poll = setInterval(() => {
      if (!document.hidden) refreshProfiles()
    }, 8000)
    const onFocus = () => {
      if (!document.hidden) refreshProfiles()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshProfiles])

  // ── credit wallet (poll Core's LIVE balance) ───────────────────────────
  // The credit pill's single source of truth: Core's liveBalance = persisted −
  // in-flight usage. Always the REMAINING amount, updated in real time as enrich/
  // verify debits it. (The per-job enrich poller also calls setCredits during a run.)
  const refreshCredits = useCallback(async () => {
    try {
      const d = await api.creditsBalance()
      if (d && typeof d.credits === 'number') setCredits(d.credits)
    } catch (e) {
      if (e instanceof AuthError) onLogout()
    }
  }, [onLogout])

  useEffect(() => {
    refreshCredits()
    const poll = setInterval(() => { if (!document.hidden) refreshCredits() }, 8000)
    const onFocus = () => { if (!document.hidden) refreshCredits() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshCredits])

  // ── Default the active-profile radio to THIS BROWSER ───────────────────
  // The profile connected through the dashboard's own browser (localExt) is the
  // one the user is sitting in — the sensible default to scrape with. Once it's
  // known + present in the list, select + PERSIST it (so the 8s poll doesn't
  // flicker it back). One-shot per load; a manual radio change afterward sticks.
  const autoSelectedLocalRef = useRef(false)
  useEffect(() => {
    if (autoSelectedLocalRef.current) return
    const localId = localExt.profileId
    if (!localId || !profiles.some((p) => p.id === localId)) return
    autoSelectedLocalRef.current = true
    if (activeProfileId !== localId) {
      setActiveProfileId(localId)
      api.activateProfile(localId).catch(() => {})
    }
  }, [localExt.profileId, profiles, activeProfileId])

  // ── Refresh on live extension state ────────────────────────────────────
  // The extension's dashboard bridge pushes a live `state` message whenever it
  // connects, disconnects, or switches profile. Refetch the account profile
  // list on those transitions so the connection (and the THIS-BROWSER radio)
  // updates immediately instead of waiting for the 8s poll. Keyed on the
  // primitive flags, so identical repeat messages don't trigger a refetch.
  useEffect(() => {
    refreshProfiles()
  }, [localExt.connected, localExt.profileId, refreshProfiles])

  // ── ui-config (logs/settings visibility) ───────────────────────────────
  useEffect(() => {
    api.uiConfig().then(setUiConfig).catch(() => {})
  }, [])

  // ── THIS browser's extension (dashboard bridge messages) ───────────────
  useEffect(() => subscribeLocalExtension(setLocalExt), [])

  // ── session countdown (decrement once per second) ──────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setMe((m) =>
        m ? { ...m, secondsLeft: Math.max(0, (m.secondsLeft || 0) - 1) } : m,
      )
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // expiry → toast, then logout
  useEffect(() => {
    if (me && me.secondsLeft === 0) {
      toast('Session expired — please sign in again', 'err')
      onLogout()
    }
  }, [me, onLogout, toast])

  // ── Email enrichment (per scrape job) ──────────────────────────────────
  const patchEnrich = useCallback((jobId, patch) => {
    setEnrichByJob((prev) => ({ ...prev, [jobId]: { ...(prev[jobId] || {}), ...patch } }))
  }, [])

  const stopEnrichPoll = useCallback((jobId) => {
    const t = enrichTimers.current[jobId]
    if (t) { clearInterval(t); delete enrichTimers.current[jobId] }
    delete enrichErrs.current[jobId]
  }, [])

  // When an enrich finishes, merge its emails back into the scrape job's file so the
  // job's OWN CSV/XLSX download contains them. The persisted resume-ref is cleared
  // only AFTER a successful merge, so a reload that re-polls a done job retries it.
  const mergeEnrichIntoJob = useCallback(async (jobId, enrichJobId) => {
    if (!enrichJobId) return
    patchEnrich(jobId, { merging: true, mergeError: null })
    try {
      const file = await api.enrichResultFile(enrichJobId)   // download from Core
      const r = await api.enrichMerge(jobId, file)            // POST to the scraper
      patchEnrich(jobId, { merging: false, merged: true, mergedCount: (r && r.updated) || 0 })
      persistEnrichRef(jobId, null)
    } catch (e) {
      if (e instanceof AuthError) { onLogout(); return }
      patchEnrich(jobId, { merging: false, mergeError: e.message || 'Could not add emails to the job file' })
      // leave the resume ref so a reload retries the merge
    }
  }, [patchEnrich, onLogout])

  // One status poll. Maps the enricher's fields → { total, done } and stops on a
  // terminal status. Tolerates a few transient errors, then gives up (job gone).
  const pollEnrichOnce = useCallback(async (jobId, enrichJobId) => {
    try {
      const s = await api.enrichStatus(enrichJobId)
      enrichErrs.current[jobId] = 0
      const total = s.totals?.totalRows ?? s.progress?.totalContacts ?? 0
      // Live "done" = rows PROCESSED so far (climbs during the run). resultCount is
      // only the final processed total, so it can't drive a live counter.
      const done = s.progress?.processedContacts ?? s.resultCount ?? 0
      // Actual emails found = the valid-status count, NOT resultCount (= rows processed).
      const validCount = s.progress?.statusCounts?.valid
      const status = String(s.status || 'running').toLowerCase()
      const terminal = ENRICH_TERMINAL.includes(status) || !!s.completedAt
      patchEnrich(jobId, {
        status, total, done,
        valid: typeof validCount === 'number' ? validCount
          : (typeof s.resultCount === 'number' ? s.resultCount : null),
        haltReason: s.haltReason || null,
        completedAt: s.completedAt || null,
      })
      // Prefer Core's LIVE balance (s.balance = liveBalance, computed fresh on every
      // poll) over the enricher's creditsRemaining metadata (a stale snapshot from
      // when the job ran). Both this and refreshCredits now read liveBalance, so the
      // pill always shows the real remaining amount and never flickers.
      const bal = typeof s.balance === 'number' ? s.balance
        : (typeof s.creditsRemaining === 'number' ? s.creditsRemaining : null)
      if (bal != null) setCredits(bal)
      if (terminal) {
        stopEnrichPoll(jobId)
        // On success, merge the emails into the scrape job's own file; otherwise just
        // drop the resume ref (nothing to merge back from a failed/stopped run).
        if (status === 'done' || status === 'completed') mergeEnrichIntoJob(jobId, enrichJobId)
        else persistEnrichRef(jobId, null)
      }
    } catch (e) {
      if (e instanceof AuthError) { stopEnrichPoll(jobId); onLogout(); return }
      const n = (enrichErrs.current[jobId] = (enrichErrs.current[jobId] || 0) + 1)
      if (n >= 4) { // ~10s of failures → the enrich job is gone/unreachable
        stopEnrichPoll(jobId); persistEnrichRef(jobId, null)
        patchEnrich(jobId, { status: 'error', error: e.message || 'Lost the enrich job' })
      }
    }
  }, [patchEnrich, stopEnrichPoll, onLogout, mergeEnrichIntoJob])

  const startEnrichPoll = useCallback((jobId, enrichJobId) => {
    stopEnrichPoll(jobId)
    pollEnrichOnce(jobId, enrichJobId)
    enrichTimers.current[jobId] = setInterval(() => {
      if (!document.hidden) pollEnrichOnce(jobId, enrichJobId)
    }, 2500)
  }, [stopEnrichPoll, pollEnrichOnce])

  // Start enriching a finished job: pull its CSV from the scraper → POST to Core
  // → poll for live counts. Throws (for the caller to toast) on a hard failure.
  const startEnrich = useCallback(async (job) => {
    const id = job.id
    patchEnrich(id, { status: 'uploading', total: job.totalLeads || 0, done: 0, valid: null, error: null, haltReason: null, enrichJobId: null, completedAt: null })
    try {
      const file = await api.jobCsvBlob(id)
      const r = await api.enrichStart(file)
      const enrichJobId = r && r.jobId
      if (!enrichJobId) throw new Error('Enricher did not return a job id')
      patchEnrich(id, { status: 'queued', enrichJobId, total: job.totalLeads || 0, done: 0 })
      persistEnrichRef(id, enrichJobId)
      if (typeof r.balance === 'number') setCredits(r.balance)
      startEnrichPoll(id, enrichJobId)
      return r
    } catch (e) {
      if (e instanceof AuthError) { onLogout(); return undefined }
      patchEnrich(id, { status: 'error', error: e.message || 'Enrichment failed' })
      throw e
    }
  }, [patchEnrich, startEnrichPoll, onLogout])

  // Resume any in-flight enrich after a reload, and clean up timers on unmount.
  useEffect(() => {
    const refs = readEnrichRefs()
    for (const [jobId, enrichJobId] of Object.entries(refs)) {
      if (!enrichJobId) continue
      patchEnrich(jobId, { status: 'queued', enrichJobId })
      startEnrichPoll(jobId, enrichJobId)
    }
    const timers = enrichTimers.current
    return () => { for (const t of Object.values(timers)) clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = {
    me,
    jobs,
    profiles,
    activeProfileId,
    connectorOnline,
    usage,
    credits,
    uiConfig,
    localExt,
    refreshProfiles,

    // job actions (SSE pushes the resulting state back, so no manual refetch)
    createJob: (payload) => guarded(() => api.createJob(payload)),
    appendJob: (id, payload) => guarded(() => api.appendJob(id, payload)),
    startJob: (id) => guarded(() => api.startJob(id)),
    stopJob: (id) => guarded(() => api.stopJob(id)),
    deleteJob: (id) => guarded(() => api.deleteJob(id)),
    jobLogs: (id) => guarded(() => api.jobLogs(id)),
    downloadUrl: api.downloadUrl,

    // email enrichment (per scrape job) — see the enrich slice above
    enrichByJob,
    startEnrich,
    enrichDownloadUrl: api.enrichDownloadUrl,

    // profile actions (refresh after, since these aren't streamed)
    activateProfile: async (id) => {
      const d = await guarded(() => api.activateProfile(id))
      refreshProfiles()
      return d
    },
    renameProfile: async (id, name) => {
      const d = await guarded(() => api.renameProfile(id, name))
      refreshProfiles()
      return d
    },
    deleteProfile: async (id) => {
      const d = await guarded(() => api.deleteProfile(id))
      refreshProfiles()
      return d
    },

    // api key
    saveKey: (key) => guarded(() => api.saveKey(key)),
    refreshMe: async () => {
      const d = await guarded(() => api.me())
      if (d) setMe((m) => ({ ...(m || {}), ...d }))
      return d
    },
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
