import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { api, AuthError, SCRAPER_HOSTS, getSavedKey, setSavedKey } from '../lib/api.js'
import { subscribeLocalExtension } from '../lib/extBridge.js'
import { useToast } from './ToastProvider.jsx'

// SHA-256 hex of a string. Used to compare THIS account's login key with the extension's key
// (the extension reports only its key's HASH) to flag an extension signed in under a DIFFERENT
// Coldcast account — reliably, and without either raw key crossing the page boundary.
async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str)))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

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

// Verify job lifecycle (the verifier engine emits queued|running|done|failed|stopped).
export const VERIFY_ACTIVE = ['uploading', 'queued', 'running', 'stopping']
const VERIFY_TERMINAL = ['done', 'failed', 'error', 'stopped', 'cancelled']

// Persist each verify UPLOAD (keyed by its verifyJobId) per-user, so a reload restores
// the live progress + finished counts. Same per-user isolation as the enrich uploads.
const VERIFY_PERSIST_FIELDS = ['status', 'verifyJobId', 'fileName', 'createdAt', 'total', 'done', 'statusCounts', 'creditsUsed', 'hasResults', 'error']
const verifyKey = (uid) => 'vk_verify_uploads:' + (uid || 'anon')
function readVerifyState(uid) {
  try { return JSON.parse(localStorage.getItem(verifyKey(uid)) || '{}') || {} } catch { return {} }
}
function persistVerifyState(uid, map) {
  try {
    const out = {}
    for (const [jid, e] of Object.entries(map || {})) {
      if (!e || !e.status || e.status === 'idle') continue
      const slim = {}
      for (const f of VERIFY_PERSIST_FIELDS) if (e[f] !== undefined) slim[f] = e[f]
      out[jid] = slim
    }
    localStorage.setItem(verifyKey(uid), JSON.stringify(out))
  } catch { /* quota */ }
}

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

// ── Per-user job-list cache (instant first-frame render on reload) ──────────────
// The dashboard talks to up to 5 separate backends, each a cold cross-region TLS
// handshake on reload — so every job grid sat EMPTY until its own SSE/poll arrived
// over that slow path. Cache each scraper's last-known list under a PER-USER key
// (localStorage is browser-global) and hydrate it in the useState initializer: the
// grid paints from the FIRST frame, then the live SSE/poll REPLACES it with the
// authoritative data. Same per-user isolation as the enrich uploads above — a
// different account signing in on this browser never sees the previous user's jobs.
// Slimmed (no logs/results) + capped so the snapshot can't approach the storage quota.
const JOBS_CACHE_MAX = 60
const jobsKey = (uid, scraper) => `vk_jobs:${scraper}:${uid || 'anon'}`
const slimJob = (j) => {
  if (!j || typeof j !== 'object') return j
  const { logs, results, ...rest } = j // drop the heavy arrays — cards don't read them
  return rest
}
function readJobsCache(uid, scraper) {
  try {
    const a = JSON.parse(localStorage.getItem(jobsKey(uid, scraper)) || '[]')
    return Array.isArray(a) ? a : []
  } catch { return [] }
}
function writeJobsCache(uid, scraper, list) {
  try {
    const slim = (Array.isArray(list) ? list : []).slice(0, JOBS_CACHE_MAX).map(slimJob)
    localStorage.setItem(jobsKey(uid, scraper), JSON.stringify(slim))
  } catch { /* quota — skip; the live stream still populates the grid */ }
}

export function AppProvider({ initialMe, onLogout, children }) {
  const toast = useToast()
  const [me, setMe] = useState(initialMe)
  // Stable per-user id used to namespace this account's enrich jobs in localStorage.
  const uid = me?.user?.id || initialMe?.user?.id || ''
  // Hydrate each grid from THIS user's cached snapshot so a reload renders instantly;
  // the live SSE/poll below replaces it with authoritative data the moment it arrives.
  const [jobs, setJobs] = useState(() => readJobsCache(uid, 'salesnav'))
  const [apolloJobs, setApolloJobs] = useState(() => readJobsCache(uid, 'apollo')) // Apollo scraper jobs (separate server) — see the SSE slice below
  const [enricherJobs, setEnricherJobs] = useState(() => readJobsCache(uid, 'enricher')) // LinkedIn URL Enricher jobs (separate server) — polled below
  const [companyJobs, setCompanyJobs] = useState(() => readJobsCache(uid, 'company')) // Company scraper jobs (separate server) — SSE below
  const [postJobs, setPostJobs] = useState(() => readJobsCache(uid, 'post')) // LinkedIn post-engagers scraper (separate server) — SSE below
  const [profiles, setProfiles] = useState([])
  const [activeProfileId, setActiveProfileId] = useState(null)
  const [connectorOnline, setConnectorOnline] = useState(false)
  const [statusLoaded, setStatusLoaded] = useState(false) // first agentStatus poll returned (avoids flashing "different account" before profiles load)
  const [accountKeyHash, setAccountKeyHash] = useState('') // sha256 of THIS account's login key — compared with the extension's reported key hash
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

  // Email verifier — standalone CSV/XLSX uploads (keyed by verifyJobId). Same
  // upload → poll → download lifecycle as the enricher, but the result is a
  // per-email status list and billing is per email checked.
  const [verifyUploads, setVerifyUploads] = useState(() => readVerifyState(uid))
  const verifyTimers = useRef({}) // verifyJobId -> setInterval handle
  const verifyErrs = useRef({})   // verifyJobId -> consecutive poll-error count

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

  // ── SSE: live Sales Nav jobs (+ poll fallback + revive-on-wake) ──────────
  // SSE gives instant updates, but an EventSource can silently die on laptop sleep,
  // a backgrounded tab, or a proxy idle-timeout WITHOUT a clean CLOSED event — which
  // used to freeze this grid until the user hard-refreshed. So we ALSO poll (gated on
  // visibility) and, on focus/visible, force a fresh fetch + revive the stream if it
  // isn't OPEN. Mirrors the Apollo/Company slices, which already poll.
  useEffect(() => {
    let es
    let closed = false
    let retry

    const load = async () => {
      try {
        const list = await api.jobs()
        if (!closed && Array.isArray(list)) setJobs(list)
      } catch { /* keep last-known; the SSE + next poll reconcile */ }
    }

    const connect = () => {
      try { es = api.events() } catch { return }
      es.addEventListener('init', (ev) => {
        try { setJobs(JSON.parse(ev.data) || []) } catch { /* ignore */ }
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
        } catch { /* ignore */ }
      })
      es.addEventListener('job:delete', (ev) => {
        try {
          const { id } = JSON.parse(ev.data)
          setJobs((prev) => prev.filter((j) => j.id !== id))
        } catch { /* ignore */ }
      })
      // Reconnect once fully CLOSED (token rejected / server closed it). Transient
      // drops auto-reconnect; a silent stall is covered by the poll + visibility revive.
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED && !closed) {
          clearTimeout(retry)
          retry = setTimeout(connect, 3000)
        }
      }
    }

    load()      // instant fresh list on mount, even before the SSE `init` lands
    connect()

    // Poll fallback — keeps the grid live even if the SSE silently stalls.
    const poll = setInterval(() => { if (!document.hidden) load() }, 8000)

    // Tab became visible/focused → refresh now AND revive the stream if it died while
    // hidden (the #1 "had to hard-refresh" cause: a slept/backgrounded tab's dead SSE).
    const onVisible = () => {
      if (document.hidden) return
      load()
      if (!es || es.readyState !== EventSource.OPEN) {
        try { if (es) es.close() } catch { /* ignore */ }
        connect()
      }
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      closed = true
      clearTimeout(retry)
      clearInterval(poll)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
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

  // ── LinkedIn Post-engagers scraper jobs (its OWN server) — live for the tab + counters ──
  // Same shape as the Company slice (global SSE + 5s poll); the Post tab reads this
  // shared store. No-op when the Post scraper server isn't configured.
  const upsertPostJob = useCallback((job) => {
    if (!job || !job.id) return
    setPostJobs((prev) => {
      const i = prev.findIndex((j) => j.id === job.id)
      if (i === -1) return [job, ...prev]
      const next = prev.slice()
      next[i] = job
      return next
    })
  }, [])
  const removePostJob = useCallback((id) => {
    setPostJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  useEffect(() => {
    if (!api.postConfigured()) return
    let alive = true
    let es
    const load = async () => {
      try {
        const list = await api.postJobs()
        if (alive) setPostJobs(Array.isArray(list) ? list : [])
      } catch { /* keep last-known; the 5s poll reconciles */ }
    }
    load()
    try {
      es = api.postEvents()
      es.addEventListener('init', (e) => {
        try { const d = JSON.parse(e.data); if (alive) setPostJobs(Array.isArray(d) ? d : []) } catch {}
      })
      es.addEventListener('job:update', (e) => { try { upsertPostJob(JSON.parse(e.data)) } catch {} })
      es.addEventListener('job:delete', (e) => {
        try { const { id } = JSON.parse(e.data); if (alive) setPostJobs((p) => p.filter((j) => j.id !== id)) } catch {}
      })
    } catch { /* EventSource unavailable → poll only */ }
    const poll = setInterval(() => { if (!document.hidden) load() }, 5000)
    return () => { alive = false; clearInterval(poll); try { es?.close() } catch {} }
  }, [upsertPostJob])

  // ── profiles + extension status (poll, focus-refresh) ──────────────────
  const refreshProfiles = useCallback(async () => {
    try {
      const d = await api.agentStatus()
      setProfiles(Array.isArray(d.profiles) ? d.profiles : [])
      setActiveProfileId(d.activeProfileId || null)
      setConnectorOnline(!!d.connectorOnline)
      setStatusLoaded(true)
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

  // ── Hash THIS account's login key once, so we can detect an extension signed in
  //    under a DIFFERENT account (its reported key hash won't match ours). getSavedKey()
  //    is set at login; fetch it via api.me() if the cache is cold. ──
  useEffect(() => {
    let alive = true
    const compute = (k) => { if (k) sha256hex(String(k).trim()).then((h) => { if (alive) setAccountKeyHash(h) }).catch(() => {}) }
    const cached = getSavedKey()
    if (cached) compute(cached)
    else api.me().then((d) => { if (d?.key) { setSavedKey(d.key); compute(d.key) } }).catch(() => {})
    return () => { alive = false }
  }, [])

  // ── session countdown (decrement once per second) ──────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setMe((m) =>
        m ? { ...m, secondsLeft: Math.max(0, (m.secondsLeft || 0) - 1) } : m,
      )
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Account expired → DON'T log out. The dashboard stays usable READ-ONLY; every product
  // action is disabled via the derived `expired` flag + the top-nav "Expired" pill, and the
  // server blocks running regardless. (Genuine token invalidation is still handled by
  // guarded() → AuthError → onLogout on a real 401.) Toast the expiry once, non-blocking.
  const expiredToasted = useRef(false)
  useEffect(() => {
    if (me && (me.user?.expired || me.secondsLeft === 0)) {
      if (!expiredToasted.current) {
        expiredToasted.current = true
        toast('Account expired — you can still view your data. Renew to run jobs.', 'err')
      }
    } else {
      expiredToasted.current = false
    }
  }, [me, toast])

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

  // Persist each scraper's live job list to THIS user's cache so the next reload paints
  // the grids instantly (see readJobsCache). Each effect rewrites only when its own list
  // changes; the live SSE/poll stays the source of truth — this is just the warm snapshot.
  useEffect(() => { writeJobsCache(uid, 'salesnav', jobs) }, [uid, jobs])
  useEffect(() => { writeJobsCache(uid, 'apollo', apolloJobs) }, [uid, apolloJobs])
  useEffect(() => { writeJobsCache(uid, 'enricher', enricherJobs) }, [uid, enricherJobs])
  useEffect(() => { writeJobsCache(uid, 'company', companyJobs) }, [uid, companyJobs])
  useEffect(() => { writeJobsCache(uid, 'post', postJobs) }, [uid, postJobs])

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

  // ── Email verifier — standalone CSV/XLSX uploads (keyed by verifyJobId) ──────
  const patchVerify = useCallback((id, patch) => {
    setVerifyUploads((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }, [])

  const stopVerifyPoll = useCallback((id) => {
    const t = verifyTimers.current[id]
    if (t) { clearInterval(t); delete verifyTimers.current[id] }
    delete verifyErrs.current[id]
  }, [])

  // Delete an upload: stop polling, drop it locally, and delete it server-side
  // (ownership-checked in Core) so it's gone everywhere — not just hidden here.
  const removeVerifyUpload = useCallback(async (id) => {
    stopVerifyPoll(id)
    setVerifyUploads((prev) => { const n = { ...prev }; delete n[id]; return n })
    try { await api.verifyDelete(id) }
    catch (e) { if (e instanceof AuthError) onLogout() /* else best-effort — a reload reconciles */ }
  }, [stopVerifyPoll, onLogout])

  // One status poll for a verify job. Maps the engine's fields → live counts and
  // stops on a terminal status.
  const pollVerifyOnce = useCallback(async (id) => {
    try {
      const s = await api.verifyStatus(id)
      verifyErrs.current[id] = 0
      const status = String(s.status || 'running').toLowerCase()
      const terminal = VERIFY_TERMINAL.includes(status)
      patchVerify(id, {
        status,
        total: s.total ?? 0,
        done: s.processed ?? 0,
        statusCounts: s.statusCounts || {},
        creditsUsed: typeof s.creditsUsed === 'number' ? s.creditsUsed : 0,
        hasResults: !!s.hasResults,
        error: s.error || null,
      })
      if (typeof s.balance === 'number') setCredits(s.balance)
      if (terminal) stopVerifyPoll(id)
    } catch (e) {
      if (e instanceof AuthError) { stopVerifyPoll(id); onLogout(); return }
      const n = (verifyErrs.current[id] = (verifyErrs.current[id] || 0) + 1)
      if (n >= 4) { // ~10s of failures → the verify job is gone/unreachable
        stopVerifyPoll(id)
        patchVerify(id, { status: 'error', error: e.message || 'Lost the verify job' })
      }
    }
  }, [patchVerify, stopVerifyPoll, onLogout])

  const startVerifyPoll = useCallback((id) => {
    stopVerifyPoll(id)
    pollVerifyOnce(id)
    verifyTimers.current[id] = setInterval(() => {
      if (!document.hidden) pollVerifyOnce(id)
    }, 2500)
  }, [stopVerifyPoll, pollVerifyOnce])

  // Start verifying an UPLOADED file: POST to Core → track by the new verify job id →
  // poll for live counts. Returns the start response. Throws for the caller to toast.
  const startVerify = useCallback(async (file) => {
    try {
      const r = await api.verifyStart(file)
      const id = r && r.jobId
      if (!id) throw new Error('Verifier did not return a job id')
      patchVerify(id, {
        verifyJobId: id, fileName: file?.name || 'upload.csv', createdAt: Date.now(),
        status: 'queued', total: 0, done: 0, statusCounts: {}, creditsUsed: 0,
        hasResults: false, error: null,
      })
      if (typeof r.balance === 'number') setCredits(r.balance)
      startVerifyPoll(id)
      return r
    } catch (e) {
      if (e instanceof AuthError) { onLogout(); return undefined }
      throw e
    }
  }, [patchVerify, startVerifyPoll, onLogout])

  // Persist the upload snapshot on every change so a reload restores it verbatim.
  useEffect(() => { persistVerifyState(uid, verifyUploads) }, [uid, verifyUploads])

  // On mount: load THIS user's verify jobs from the server (authoritative + cross-device),
  // replace the local cache, and re-attach a live poll to any still-running one.
  useEffect(() => {
    let cancelled = false
    api.verifyList()
      .then((res) => {
        if (cancelled || !res || !Array.isArray(res.jobs)) return
        const map = {}
        for (const j of res.jobs) {
          if (!j || !j.verifyJobId) continue
          map[j.verifyJobId] = {
            verifyJobId: j.verifyJobId, fileName: j.fileName, createdAt: j.createdAt,
            status: j.status, total: j.total, done: j.done, statusCounts: j.statusCounts || {},
            creditsUsed: j.creditsUsed, hasResults: j.hasResults, error: null,
          }
        }
        setVerifyUploads(map)
        for (const j of res.jobs) {
          if (j && j.verifyJobId && VERIFY_ACTIVE.includes(String(j.status || '').toLowerCase())) startVerifyPoll(j.verifyJobId)
        }
      })
      .catch((e) => { if (e instanceof AuthError) onLogout() })
    const timers = verifyTimers.current
    return () => { cancelled = true; for (const t of Object.values(timers)) clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The profile a NEW job runs on: STRICTLY this browser's own profile, and only when
  // the extension here is connected. NEVER fall back to another profile or the shared
  // "active" profile — those belong to other machines and would route the scrape to the
  // wrong browser (the multi-machine isolation bug). Null when this browser isn't
  // connected → the create flow blocks Run and the server refuses to start.
  // Does the extension's connected profile actually belong to the CURRENTLY logged-in
  // account? The extension's socket can be OPEN under a DIFFERENT account's API key in
  // the same browser (the user switched dashboard login) — that profile won't appear in
  // OUR profile list. This is the guard that stops a different account reading as "connected".
  const localProfileOwned = !!localExt.profileId && profiles.some((p) => p.id === localExt.profileId)

  // Does the SERVER (the hub) actually see THIS browser's profile online right now? This is
  // the same authoritative signal the top-nav uses (agentStatus → hub.isOnline). The
  // extension's own localExt.connected flag can go STALE — an evicted MV3 service worker or
  // a dropped socket leaves chrome.storage saying connected=true — which showed a green
  // "Connected" on a scraper page while the top-nav (server view) correctly said "Not
  // connected". Gating the page on this keeps every surface in agreement.
  const localProfileServerOnline = !!localExt.profileId && profiles.some((p) => p.id === localExt.profileId && p.online)

  // "Connected as a different account". RELIABLE signal: the extension reports its key's
  // HASH (never the raw key); if it differs from OUR logged-in account key's hash, the
  // extension is signed in under another Coldcast account. This replaces the old
  // profileId-ownership check, which gave FALSE NEGATIVES — the machine profileId is reused
  // across accounts, so a profile this account once owned stays in its list and the mismatch
  // went undetected (green "Connected" everywhere). The profileId check remains only as a
  // fallback for older extensions that don't report a key hash yet.
  const keyMismatch = !!(accountKeyHash && localExt.keyHash && accountKeyHash !== localExt.keyHash)
  const localAccountMismatch = keyMismatch
    ? !!localExt.installed   // a different key = a different account (whether or not it's fully connected)
    : !!(localExt.installed && localExt.connected && localExt.profileId && statusLoaded && !localProfileOwned)

  // Route jobs to THIS browser only when its profile is connected AND owned by us.
  const onlineProfileId = (localExt.connected && localProfileOwned) ? localExt.profileId : null

  // THIS browser's connection as ONE boolean — the SAME server-confirmed signal
  // scraperConnected uses (minus the per-scraper host check). The top-nav pill reads this so
  // it says "Connected"/"Not connected" for THE BROWSER YOU'RE IN, consistent with the page
  // banners — instead of an account-level "X/Y connected" count that read "0/2 connected"
  // while the page correctly said this browser wasn't connected.
  const browserConnected = !!(
    localExt.installed && localExt.connected && localExt.profileId &&
    (!statusLoaded || (localProfileOwned && localProfileServerOnline))
  )

  // Is THIS browser's extension connected to a specific scraper's hub, FOR THIS account?
  // Uses the extension's per-hub report (serverStatus, keyed by host); requires the
  // profile be ours (a different account's open socket is never "connected" for us).
  // Older extensions with no per-hub status fall back to the aggregate `connected`.
  const scraperConnected = (key) => {
    if (!localExt.installed || !localExt.connected || !localExt.profileId) return false
    if (localAccountMismatch) return false                      // different account → not connected for us. Instant (from the live key hash), so the page banner + New Job flip WITHOUT waiting for the 8s agentStatus poll to mark the profile offline.
    if (statusLoaded && !localProfileOwned) return false        // connected, but as another account
    if (statusLoaded && !localProfileServerOnline) return false // local flag says connected, but the hub doesn't see it → match the top-nav
    const host = SCRAPER_HOSTS[key]
    const ss = localExt.serverStatus || {}
    if (host && Object.keys(ss).length) return !!ss[host]
    return true
  }

  // Account expired: the plan lapsed. READ-ONLY — the dashboard loads + shows past data, but
  // EVERY product action (New Job / Create Job / Run / Resume / enrich upload) is disabled,
  // and Core blocks running server-side too. me.user.expired is the authoritative server flag;
  // secondsLeft<=0 is the live-countdown fallback (an account that expires mid-session).
  const expired = !!(me && (me.user?.expired || (me.secondsLeft != null && me.secondsLeft <= 0)))

  // Tell the extension (via its dashboard-bridge) when THIS browser is connected under a
  // DIFFERENT account than the one logged in here, so the extension popup + sidebar can
  // warn instead of showing a misleading "Connected". The content script writes it to
  // chrome.storage; the popup/sidebar read it. No account identity is sent — just a flag.
  useEffect(() => {
    const send = () => {
      try {
        window.postMessage(
          { source: 'coldcast-page', type: 'dash-state', accountMismatch: localAccountMismatch },
          window.location.origin,
        )
      } catch { /* not in a browser that can postMessage — ignore */ }
    }
    // Assert immediately whenever the verdict OR the extension's own reported state changes
    // (deps below) — so the instant a DIFFERENT account's key connects (localExt.profileId
    // flips to a profile we don't own → mismatch=true), the popup + sidebar drop the
    // misleading green "Connected" and show "Different account", no hard refresh.
    send()
    // Heartbeat: re-assert on a slow cadence so a verdict the bridge missed (service-worker
    // restart, popup/sidebar opened after the change, a reconnect race that reset storage)
    // self-heals within a few seconds. The bridge stores this under a key that's NOT in its
    // own state KEYS, so re-posting never loops back. Quiet while the tab is hidden.
    const t = setInterval(() => { if (!document.hidden) send() }, 5000)
    return () => clearInterval(t)
  }, [localAccountMismatch, localExt.connected, localExt.profileId])

  const value = {
    me,
    expired,
    jobs,
    apolloJobs,
    upsertApolloJob,
    removeApolloJob,
    enricherJobs,
    companyJobs,
    upsertCompanyJob,
    removeCompanyJob,
    postJobs,
    upsertPostJob,
    removePostJob,
    profiles,
    activeProfileId,
    onlineProfileId,
    scraperConnected,
    browserConnected,
    localAccountMismatch,
    localProfileName: localExt.profileName,
    connectorOnline,
    // Expired accounts show ZERO scraping quota + ZERO email credits everywhere (top nav,
    // waterfall, enricher) — they can't run anything, and Core enforces 0 server-side too.
    usage: expired ? { limit: 0, used: 0, resetsDaily: false } : usage,
    credits: expired ? 0 : credits,
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

    // Email verifier (standalone uploads) — see the verify slice above
    verifyUploads,
    startVerify,
    removeVerifyUpload,
    verifyDownloadUrl: api.verifyDownloadUrl,

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
