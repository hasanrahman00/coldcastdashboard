import { useState, useEffect, useCallback } from 'react'
import { api, getToken, setToken, setSavedKey, clearAuth } from './lib/api.js'
import { ToastProvider } from './store/ToastProvider.jsx'
import { AppProvider } from './store/AppStore.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './components/Dashboard.jsx'

// Boot splash while we validate a stored token.
function BootSplash() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    </div>
  )
}

export default function App() {
  const [booted, setBooted] = useState(false)
  const [me, setMe] = useState(null)

  // On load: if a token exists, validate it via /api/auth/me.
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setBooted(true)
      return
    }
    api
      .me()
      .then((d) => setMe(d))
      .catch(() => clearAuth())
      .finally(() => setBooted(true))
  }, [])

  // Called by <Login> on a successful POST /api/auth/login.
  const handleLogin = useCallback((resp, key) => {
    setToken(resp.token)
    setSavedKey(key) // remember the key they signed in with → API tab can show it
    setMe({
      user: resp.user,
      expiresAt: resp.expiresAt,
      secondsLeft: resp.secondsLeft,
    })
    window.location.hash = '#/salesnav'
  }, [])

  const handleLogout = useCallback(() => {
    api.logout()
    clearAuth()
    setMe(null)
  }, [])

  return (
    <ToastProvider>
      {!booted ? (
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
