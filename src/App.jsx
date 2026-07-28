import { useState, useEffect, useCallback } from 'react'
import { api, AuthError, getToken, setToken, setSavedKey, clearAuth, getCachedMe, setCachedMe } from './lib/api.js'
import { ToastProvider } from './store/ToastProvider.jsx'
import { AppProvider } from './store/AppStore.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Admin from './pages/Admin.jsx'
import Trial from './pages/Trial.jsx'
import { Crisp } from 'crisp-sdk-web'

// Crisp live chat — same website ID (shared inbox) as the marketing site. This is a
// PUBLIC client key (it ships in every Crisp embed), so it's safe in the bundle.
const CRISP_WEBSITE_ID = '71962233-1845-425d-b872-a0d6ec4c4658'

// Boot splash while we validate a stored token.
function BootSplash() {
  return (
    <div className="boot">
      <span className="spin" />
      <span>Loading…</span>
    </div>
  )
}

export default function App() {
  const [booted, setBooted] = useState(false)
  const [me, setMe] = useState(null)

  // Top-level route check: #/admin is a SEPARATE app (own X-Admin-Password gate),
  // independent of user login — so it's handled before the login flow and exempt
  // from the logged-out → /#/login redirect below.
  const [hashRoute, setHashRoute] = useState(() => window.location.hash.replace(/^#\/?/, ''))
  useEffect(() => {
    const onHash = () => setHashRoute(window.location.hash.replace(/^#\/?/, ''))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const isAdmin = hashRoute === 'admin'
  const isTrial = hashRoute === 'trial' // public self-serve trial (#trial or #/trial)

  // Live chat (Crisp) — load the chatbox once, colored to the dashboard's indigo accent.
  useEffect(() => {
    Crisp.configure(CRISP_WEBSITE_ID)
    Crisp.setColorTheme('indigo')
  }, [])

  // Identify the signed-in user to Crisp so support knows who's chatting.
  useEffect(() => {
    if (!me?.user) return
    try {
      if (me.user.username) Crisp.user.setNickname(me.user.username)
      if (me.user.email) Crisp.user.setEmail(me.user.email)
    } catch {}
  }, [me])

  // On load: if a token exists, restore the cached session immediately (so a
  // refresh doesn't flash login), then validate via /api/auth/me in the
  // background. ONLY a genuine 401 ends the session — a network/CORS/backend
  // hiccup keeps the user logged in instead of bouncing them to /#/login.
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setBooted(true)
      return
    }
    const cached = getCachedMe()
    if (cached && cached.secondsLeft > 0) {
      setMe(cached) // optimistic restore
      setBooted(true) // render the dashboard instantly; validate in the background
    }
    api
      .me()
      .then((d) => {
        if (d && d.user) {
          setMe(d)
          setCachedMe(d)
        }
        // a non-401 that returns no user (e.g. misconfigured API URL) is ignored
        // here — we keep the cached session rather than nuking it.
      })
      .catch((e) => {
        if (e instanceof AuthError) {
          clearAuth()
          setMe(null)
        }
        // network / transient error → keep the (cached) session as-is
      })
      .finally(() => setBooted(true))
  }, [])

  // Called by <Login> on a successful POST /api/auth/login.
  const handleLogin = useCallback((resp, key) => {
    setToken(resp.token)
    setSavedKey(key) // remember the key they signed in with → API tab can show it
    const meObj = {
      user: resp.user,
      expiresAt: resp.expiresAt,
      secondsLeft: resp.secondsLeft,
    }
    setCachedMe(meObj) // so a later refresh restores instantly without a server round-trip
    setMe(meObj)
    // Fresh login → clear any prior "I'll finish later" so the setup guide greets
    // new (not-yet-connected) users again. Already-connected browsers self-suppress.
    sessionStorage.removeItem('cc_guide_dismissed')
    window.location.hash = '#/salesnav'
  }, [])

  const handleLogout = useCallback(() => {
    api.logout()
    clearAuth()
    setMe(null)
  }, [])

  // Logged out (and done booting) → force the login URL no matter what path was
  // requested. So /#/salesnav, /#/anything, or a bare URL all land on /#/login
  // when there's no valid session.
  useEffect(() => {
    if (booted && !me && !isAdmin && !isTrial && !window.location.hash.startsWith('#/login')) {
      window.location.hash = '#/login'
    }
  }, [booted, me, isAdmin, isTrial])

  return (
    <ToastProvider>
      {isAdmin ? (
        <Admin />
      ) : isTrial ? (
        <Trial />
      ) : !booted ? (
        <BootSplash />
      ) : me ? (
        <AppProvider initialMe={me} onLogout={handleLogout}>
          <Dashboard onLogout={handleLogout} />
        </AppProvider>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </ToastProvider>
  )
}
