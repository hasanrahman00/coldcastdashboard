import { useState, useEffect, useCallback } from 'react'
import { api, getToken, setToken, setSavedKey, clearAuth } from './lib/api.js'
import { ToastProvider } from './store/ToastProvider.jsx'
import { AppProvider } from './store/AppStore.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './components/Dashboard.jsx'

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
    window.location.hash = '#/dash'
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
