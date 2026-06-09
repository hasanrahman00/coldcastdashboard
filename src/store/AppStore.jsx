import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { api, AuthError } from '../lib/api.js'
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

export function AppProvider({ initialMe, onLogout, children }) {
  const toast = useToast()
  const [me, setMe] = useState(initialMe)
  const [jobs, setJobs] = useState([])
  const [profiles, setProfiles] = useState([])
  const [activeProfileId, setActiveProfileId] = useState(null)
  const [connectorOnline, setConnectorOnline] = useState(false)
  const [uiConfig, setUiConfig] = useState({ hideLogs: false, hideSettings: false })

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

  // ── ui-config (logs/settings visibility) ───────────────────────────────
  useEffect(() => {
    api.uiConfig().then(setUiConfig).catch(() => {})
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

  // expiry → toast, then logout
  useEffect(() => {
    if (me && me.secondsLeft === 0) {
      toast('Session expired — please sign in again', 'err')
      onLogout()
    }
  }, [me, onLogout, toast])

  const value = {
    me,
    jobs,
    profiles,
    activeProfileId,
    connectorOnline,
    uiConfig,
    refreshProfiles,

    // job actions (SSE pushes the resulting state back, so no manual refetch)
    createJob: (payload) => guarded(() => api.createJob(payload)),
    startJob: (id) => guarded(() => api.startJob(id)),
    stopJob: (id) => guarded(() => api.stopJob(id)),
    deleteJob: (id) => guarded(() => api.deleteJob(id)),
    jobLogs: (id) => guarded(() => api.jobLogs(id)),
    downloadUrl: api.downloadUrl,

    // profile actions (refresh after, since these aren't streamed)
    activateProfile: async (id) => {
      const d = await guarded(() => api.activateProfile(id))
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
