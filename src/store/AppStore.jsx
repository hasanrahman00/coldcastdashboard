import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { api, AuthError, SCRAPER_HOSTS } from '../lib/api.js'
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
// NOTE: the enricher writes meta status 'pause' / 'stop' (present tense) for a
// credit halt / user stop — include both those and the past-tense forms.
const ENRICH_TERMINAL = ['done', 'completed', 'failed', 'error', 'stop', 'stopped', 'pause', 'paused', 'cancelled']
// In-flight enrich statuses — while one holds, this job's scrape Run is disabled.
// NOTE: the enricher reports the running status as 'run' (not 'running'); both are
// listed so the live panel matches whatever the engine sends.
export const ENRICH_ACTIVE = ['uploading', 'queued', 'queueing', 'run', 'running', 'processing', 'started', 'stopping', 'pausing']

// Persist scrapeJobId → enrichJobId so a page reload RESUMES the live enrich view
// (and prevents an accidental double-charge re-run of an already-running job).
// Persist a compact snapshot of every Waterfall enrich UPLOAD (keyed by its enrichJobId)
// so a browser reload restores the live "Enriching…" progress AND the finished result.
// Written on every state change, hydrated by the useState initializer + resume effect.
const ENRICH_PERSIST_FIELDS = ['status', 'enrichJobId', 'fileName', 'createdAt', 'total', 'done', 'valid', 'creditsUsed', 'haltReason', 'completedAt', 'error']
// SCOPE the persisted enrich jobs PER USER. localStorage is browser-global, so without a
// per-user key a different account logging in on the same browser would see the previous
// user's jobs. (The data itself is already safe — Core's download endpoint is ownership-
// checked — but the list must not show another account's jobs.)
const enrichKey = (uid) => 'vk_enrich_uploads:' + (uid || 'anon')
function readEnrichState(uid) {
  try { return JSON.parse(localStorage.getItem(enrichKey(uid)) || '{}') || {} } catch { return {} }
}
function persistEnrichState(uid, map) {
  try {
    const out = {}
    for (const [jid, e] of Object.entries(map || {})) {
      if (!e || !e.status || e.status === 'idle') continue
      const slim = {}
      for (const f of ENRICH_PERSIST_FIELDS) if (e[f] !== undefined) slim[f] = e[f]
      out[jid] = slim
    }
    localStorage.setItem(enrichKey(uid), JSON.stringify(out))
  } catch { /* quota */ }
}

export function AppProvider({ initialMe, onLogout, children }) {
  const toast = useToast()
  const [me, setMe] = useState(initialMe)
  // Stable per-user id used to namespace this account's enrich jobs in localStorage.
  const uid = me?.user?.id || initialMe?.user?.id || ''
  const [jobs, setJobs] = useState([])
  const [apolloJobs, setApolloJobs] = useState([]) // Apollo scraper jobs (separate server) — see the SSE slice below
  const [enricherJobs, setEnricherJobs] = useState([]) // LinkedIn URL Enricher jobs (separate server) — polled below
  const [companyJobs, setCompanyJobs] = useState([]) // Company scraper jobs (separate server) — SSE below
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
    serverStatus: {}, // { '<scraper host>': bool } — per-hub connection for THIS browser
  })
  // Per-scrape-job enrich state, keyed by job id. Kept OUT of the `jobs` array
  // because SSE replaces job objects wholesale on every job:update (which would
  // wipe it). The enricher has no SSE → we poll Core for live counts.
  // Hydrate the persisted upload snapshot in the initializer so a reload shows the right
  // state from the FIRST frame — active progress OR the finished result. The resume
  // effect (below) re-attaches live polls to any still-running upload.
  const [enrichUploads, setEnrichUploads] = useState(() => readEnrichState(uid))
  const enrichTimers = useRef({}) // enrichJobId -> setInterval handle
  const enrichErrs = useRef({})   // enrichJobId -> consecutive poll-error count

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

  // ── Apollo scraper jobs (its OWN server) — live for the GLOBAL counters ──
  // Apollo runs on a separate backend, so the header's Total/Running counters
  // can't see it through the Sales Nav SSE above. Stream Apollo's jobs here (SSE
  // + 5s poll) so StatsBox — and the Apollo tab — read ONE shared, always-live
  // source, instead of the tab opening its own duplicate stream only while it's
  // mounted. No-op when the Apollo server isn't configured.
  const upsertApolloJob = useCallback((job) => {
    if (!job || !job.id) return
    setApolloJobs((prev) => {
      const i = prev.findIndex((j) => j.id === job.id)
      if (i === -1) return [job, ...prev]
      const next = prev.slice()
      next[i] = job
      return next
    })
  }, [])
  const removeApolloJob = useCallback((id) => {
    setApolloJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  useEffect(() => {
    if (!api.apolloConfigured()) return
    let alive = true
    let es
    const load = async () => {
      try {
        const list = await api.apolloJobs()
        if (alive) setApolloJobs(Array.isArray(list) ? list : [])
      } catch {
        /* keep last-known; the 5s poll reconciles */
      }
    }
    load()
    try {
      es = api.apolloEvents()
      es.addEventListener('init', (e) => {
        try { const d = JSON.parse(e.data); if (alive) setApolloJobs(Array.isArray(d) ? d : []) } catch {}
      })
      es.addEventListener('job:update', (e) => {
        try { upsertApolloJob(JSON.parse(e.data)) } catch {}
      })
      es.addEventListener('job:delete', (e) => {
        try { const { id } = JSON.parse(e.data); if (alive) setApolloJobs((p) => p.filter((j) => j.id !== id)) } catch {}
      })
    } catch {
      /* EventSource unavailable → poll only */
    }
    const poll = setInterval(() => { if (!document.hidden) load() }, 5000)
    return () => { alive = false; clearInterval(poll); try { es?.close() } catch {} }
  }, [upsertApolloJob])

  // ── LinkedIn URL Enricher jobs (its OWN server) — polled for the GLOBAL counters ──
  // No global SSE (its stream is per-job), so a light 6s poll keeps the header's
  // Total/Running live from any tab. No-op when the enricher server isn't configured.
  useEffect(() => {
    if (!api.enricherConfigured()) return
    let alive = true
    const load = async () => {
      try {
        const list = await api.enricherJobs()
        if (alive) setEnricherJobs(Array.isArray(list) ? list : [])
      } catch {
        /* keep last-known */
      }
    }
    load()
    const poll = setInterval(() => { if (!document.hidden) load() }, 6000)
    return () => { alive = false; clearInterval(poll) }
  }, [])

  // ── Company scraper jobs (its OWN server) — live for the tab + GLOBAL counters ──
  // Same shape as the Apollo slice (global SSE + 5s poll); the Company tab reads this
  // shared store. No-op when the Company server isn't configured.
  const upsertCompanyJob = useCallback((job) => {
    if (!job || !job.id) return
    setCompanyJobs((prev) => {
      const i = prev.findIndex((j) => j.id === job.id)
      if (i === -1) return [job, ...prev]
      const next = prev.slice()
      next[i] = job
      return next
    })
  }, [])
  const removeCompanyJob = useCallback((id) => {
    setCompanyJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  useEffect(() => {
    if (!api.companyConfigured()) return
    let alive = true
    let es
    const load = async () => {
      try {
        const list = await api.companyJobs()
        if (alive) setCompanyJobs(Array.isArray(list) ? list : [])
      } catch {
        /* keep last-known; the 5s poll reconciles */
      }
    }
    load()
    try {
      es = api.companyEvents()
      es.addEventListener('init', (e) => {
        try { const d = JSON.parse(e.data); if (alive) setCompanyJobs(Array.isArray(d) ? d : []) } catch {}
      })
      es.addEventListener('job:update', (e) => {
        try { upsertCompanyJob(JSON.parse(e.data)) } catch {}
      })
      es.addEventListener('job:delete', (e) => {
        try { const { id } = JSON.parse(e.data); if (alive) setCompanyJobs((p) => p.filter((j) => j.id !== id)) } catch {}
      })
    } catch {
      /* EventSource unavailable → poll only */
    }
    const poll = setInterval(() => { if (!document.hidden) load() }, 5000)
    return () => { alive = false; clearInterval(poll); try { es?.close() } catch {} }
  }, [upsertCompanyJob])

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

  // ── Waterfall Email Enricher — standalone CSV uploads (keyed by enrichJobId) ──
  // Upload a file → POST to /api/enrich/start → poll live → download the result. No
  // scrape job and no merge: the user downloads the enriched file. The engine halts at
  // the credit budget, so credits charged == valid emails in the result. Persisted +
  // resumed across reloads so a running job's live panel survives a refresh.
  const patchEnrich = useCallback((id, patch) => {
    setEnrichUploads((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }, [])

  const stopEnrichPoll = useCallback((id) => {
    const t = enrichTimers.current[id]
    if (t) { clearInterval(t); delete enrichTimers.current[id] }
    delete enrichErrs.current[id]
  }, [])

  // Delete an upload: stop polling, drop it locally, and delete it server-side (ownership-
  // checked in Core) so it's gone everywhere — not just hidden in this browser.
  const removeEnrichUpload = useCallback(async (id) => {
    stopEnrichPoll(id)
    setEnrichUploads((prev) => { const n = { ...prev }; delete n[id]; return n })
    try { await api.enrichDelete(id) }
    catch (e) { if (e instanceof AuthError) onLogout() /* else best-effort — a reload reconciles from the server */ }
  }, [stopEnrichPoll, onLogout])

  // One status poll for a standalone enrich job (keyed by its own enrichJobId). Maps the
  // enricher's fields → live counts and stops on a terminal status.
  const pollEnrichOnce = useCallback(async (id) => {
    try {
      const s = await api.enrichStatus(id)
      enrichErrs.current[id] = 0
      const total = s.totals?.totalRows ?? s.progress?.totalContacts ?? 0
      const done = s.progress?.processedContacts ?? s.resultCount ?? 0
      const validCount = s.progress?.statusCounts?.valid
      const status = String(s.status || 'running').toLowerCase()
      const terminal = ENRICH_TERMINAL.includes(status) || !!s.completedAt
      patchEnrich(id, {
        status, total, done,
        valid: typeof validCount === 'number' ? validCount
          : (typeof s.resultCount === 'number' ? s.resultCount : null),
        creditsUsed: typeof s.creditsUsed === 'number' ? s.creditsUsed : 0,
        haltReason: s.haltReason || null,
        completedAt: s.completedAt || null,
      })
      // s.balance = Core's live balance, computed fresh each poll → keeps the pill ticking
      // down in real time as valids resolve (no flicker; matches refreshCredits).
      const bal = typeof s.balance === 'number' ? s.balance
        : (typeof s.creditsRemaining === 'number' ? s.creditsRemaining : null)
      if (bal != null) setCredits(bal)
      if (terminal) stopEnrichPoll(id)
    } catch (e) {
      if (e instanceof AuthError) { stopEnrichPoll(id); onLogout(); return }
      const n = (enrichErrs.current[id] = (enrichErrs.current[id] || 0) + 1)
      if (n >= 4) { // ~10s of failures → the enrich job is gone/unreachable
        stopEnrichPoll(id)
        patchEnrich(id, { status: 'error', error: e.message || 'Lost the enrich job' })
      }
    }
  }, [patchEnrich, stopEnrichPoll, onLogout])

  const startEnrichPoll = useCallback((id) => {
    stopEnrichPoll(id)
    pollEnrichOnce(id)
    enrichTimers.current[id] = setInterval(() => {
      if (!document.hidden) pollEnrichOnce(id)
    }, 2500)
  }, [stopEnrichPoll, pollEnrichOnce])

  // Start enriching an UPLOADED file: POST to Core → track by the new enrich job id →
  // poll for live counts. Returns the start response. Throws for the caller to toast.
  const startEnrich = useCallback(async (file) => {
    try {
      const r = await api.enrichStart(file)
      const id = r && r.jobId
      if (!id) throw new Error('Enricher did not return a job id')
      patchEnrich(id, {
        enrichJobId: id, fileName: file?.name || 'upload.csv', createdAt: Date.now(),
        status: 'queued', total: 0, done: 0, valid: null, creditsUsed: 0,
        error: null, haltReason: null, completedAt: null,
      })
      if (typeof r.balance === 'number') setCredits(r.balance)
      startEnrichPoll(id)
      return r
    } catch (e) {
      if (e instanceof AuthError) { onLogout(); return undefined }
      throw e
    }
  }, [patchEnrich, startEnrichPoll, onLogout])

  // Persist the upload snapshot on every change so a reload restores it verbatim.
  useEffect(() => { persistEnrichState(uid, enrichUploads) }, [uid, enrichUploads])

  // On mount: load THIS user's jobs from the server (authoritative + cross-device), replace
  // the localStorage cache, and re-attach a live poll to any still-running one. The
  // useState init already rendered the cached snapshot instantly; this refreshes it. On a
  // fetch failure we keep the cache (graceful offline).
  useEffect(() => {
    let cancelled = false
    api.enrichList()
      .then((res) => {
        if (cancelled || !res || !Array.isArray(res.jobs)) return
        const map = {}
        for (const j of res.jobs) if (j && j.enrichJobId) map[j.enrichJobId] = j
        setEnrichUploads(map)
        for (const j of res.jobs) {
          if (j && j.enrichJobId && ENRICH_ACTIVE.includes(String(j.status || '').toLowerCase())) startEnrichPoll(j.enrichJobId)
        }
      })
      .catch((e) => { if (e instanceof AuthError) onLogout() })
    const timers = enrichTimers.current
    return () => { cancelled = true; for (const t of Object.values(timers)) clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The profile a NEW job runs on: STRICTLY this browser's own profile, and only when
  // the extension here is connected. NEVER fall back to another profile or the shared
  // "active" profile — those belong to other machines and would route the scrape to the
  // wrong browser (the multi-machine isolation bug). Null when this browser isn't
  // connected → the create flow blocks Run and the server refuses to start.
  const onlineProfileId = (localExt.connected && localExt.profileId) ? localExt.profileId : null

  // Is THIS browser's extension connected to a specific scraper's hub? Uses the
  // extension's per-hub report (serverStatus, keyed by host); falls back to the
  // aggregate `connected` for older extensions that don't send per-hub status yet.
  // Every scraper page uses this to show connected/not + gate Run before a job runs.
  const scraperConnected = (key) => {
    if (!localExt.installed || !localExt.profileId) return false
    const host = SCRAPER_HOSTS[key]
    const ss = localExt.serverStatus || {}
    if (host && Object.keys(ss).length) return !!ss[host]
    return !!localExt.connected
  }

  const value = {
    me,
    jobs,
    apolloJobs,
    upsertApolloJob,
    removeApolloJob,
    enricherJobs,
    companyJobs,
    upsertCompanyJob,
    removeCompanyJob,
    profiles,
    activeProfileId,
    onlineProfileId,
    scraperConnected,
    localProfileName: localExt.profileName,
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

    // Waterfall email enricher (standalone uploads) — see the enrich slice above
    enrichUploads,
    startEnrich,
    removeEnrichUpload,
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
