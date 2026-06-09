import { useState } from 'react'
import { api } from '../lib/api.js'
import { useToast } from '../store/ToastProvider.jsx'
import { IconLogo, IconKeyOutline } from '../lib/icons.jsx'

export default function Login({ onLogin }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const k = key.trim()
    if (!k) return toast('Enter your access key', 'err')
    setBusy(true)
    try {
      const resp = await api.login(k)
      onLogin(resp, k)
    } catch (err) {
      toast(err.message || 'Login failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">
            <IconLogo />
          </span>
          <h1>Coldcast</h1>
          <p>Sign in to your dashboard</p>
        </div>

        <form onSubmit={submit}>
          <label>Access key</label>
          <div className="login-field">
            <IconKeyOutline />
            <input
              type="password"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your key"
            />
          </div>

          <button type="submit" className="btn btn-p login-btn" disabled={busy}>
            {busy && <span className="spin" style={{ width: 15, height: 15, borderColor: 'rgba(255,255,255,.6)', borderTopColor: 'transparent' }} />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="login-foot">Don't have a key? Contact your administrator.</p>
        </form>
      </div>
    </div>
  )
}
