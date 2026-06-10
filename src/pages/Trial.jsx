import { useState } from 'react'
import { api, setToken, setSavedKey, setCachedMe } from '../lib/api.js'
import { useToast } from '../store/ToastProvider.jsx'
import { IconLogo, IconUser, IconKeyOutline, IconCopy } from '../lib/icons.jsx'

// Public self-serve trial page (app.coldcast.io/#trial). No login required.
// Mints a 1-day key via POST /api/trial, then can auto-log-in straight into the app.
export default function Trial() {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { username, key, expiresAt, trialDays }
  const [entering, setEntering] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const u = username.trim()
    if (!u) return setError('Pick a username to continue.')
    setBusy(true)
    try {
      const d = await api.trial({ username: u, email: email.trim() })
      setResult(d)
    } catch (err) {
      setError(err.message || 'Could not start your trial. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const copyKey = () =>
    navigator.clipboard?.writeText(result.key).then(() => toast('Key copied', 'ok')).catch(() => {})

  // Exchange the trial key for a session and drop the user straight into the app.
  const enterApp = async () => {
    setEntering(true)
    try {
      const resp = await api.login(result.key)
      setToken(resp.token)
      setSavedKey(result.key)
      setCachedMe({ user: resp.user, expiresAt: resp.expiresAt, secondsLeft: resp.secondsLeft })
      window.location.hash = '#/salesnav'
      window.location.reload()
    } catch {
      // fall back to the login page with the key copied
      copyKey()
      window.location.hash = '#/login'
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card" style={{ maxWidth: 420 }}>
        {!result ? (
          <form onSubmit={submit}>
            <div className="login-brand">
              <span className="login-logo"><IconLogo /></span>
              <h1>Start your free trial</h1>
              <p>1 day free · no card · get a key instantly</p>
            </div>

            <label>Username</label>
            <div className="login-field">
              <IconUser />
              <input type="text" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. acme-corp" autoComplete="off" />
            </div>

            <label style={{ marginTop: 14 }}>Email <span style={{ textTransform: 'none', fontWeight: 500, color: 'var(--text-faint)' }}>(optional)</span></label>
            <div className="login-field">
              <IconKeyOutline />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </div>

            {error && <div className="trial-err">{error}</div>}

            <button type="submit" className="btn btn-p login-btn" disabled={busy}>
              {busy && <span className="spin" style={{ width: 15, height: 15, borderColor: 'rgba(255,255,255,.6)', borderTopColor: 'transparent' }} />}
              {busy ? 'Creating your trial…' : 'Start free trial'}
            </button>

            <p className="login-foot">Already have a key? <a href="#/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Log in</a></p>
          </form>
        ) : (
          <div>
            <div className="login-brand">
              <span className="login-logo"><IconLogo /></span>
              <h1>You're in 🎉</h1>
              <p>Your trial is active for {result.trialDays || 1} day{(result.trialDays || 1) === 1 ? '' : 's'}.</p>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconKeyOutline className="trial-klbl" /> Your access key</label>
            <div className="key-box" style={{ marginTop: 6 }}>
              <div className="key-val">{result.key}</div>
              <button className="btn btn-p" onClick={copyKey} style={{ width: 'auto', padding: '0 18px' }}><IconCopy /> Copy</button>
            </div>
            <p className="trial-note">Save it somewhere safe — it won't be shown again.</p>

            <button className="btn btn-p login-btn" onClick={enterApp} disabled={entering}>
              {entering && <span className="spin" style={{ width: 15, height: 15, borderColor: 'rgba(255,255,255,.6)', borderTopColor: 'transparent' }} />}
              {entering ? 'Signing you in…' : 'Continue to dashboard →'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .login-card .login-field input[type=email]{width:100%;padding:11px 14px 11px 38px;background:var(--bg);border:1px solid var(--border-strong);border-radius:10px;color:var(--text);font-size:14px;font-family:var(--font)}
        .login-card .login-field input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(99,102,241,.15);background:var(--bg-elev-1)}
        .trial-err{margin-top:14px;padding:9px 12px;border-radius:9px;background:var(--redglow);border:1px solid rgba(225,29,72,.25);color:var(--red);font-size:12.5px;font-weight:600}
        .trial-note{font-size:11.5px;color:var(--text-faint);margin-top:7px}
        .trial-klbl{width:14px;height:14px}
      `}</style>
    </div>
  )
}
