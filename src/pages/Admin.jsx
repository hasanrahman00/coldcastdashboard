import { useState, useEffect, useCallback } from 'react'
import { admin, setAdminPassword } from '../lib/api.js'
import { useToast } from '../store/ToastProvider.jsx'
import { IconLogo, IconKeyOutline, IconPlus, IconTrash, IconCopy, IconSignout } from '../lib/icons.jsx'

const PW_KEY = 'cc_admin_pw'
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

function statusOf(u) {
  if (u.disabled) return { label: 'Disabled', color: '#e11d48' }
  if (u.expired) return { label: 'Expired', color: '#b45309' }
  return { label: 'Active', color: '#047857' }
}

// ── password gate ────────────────────────────────────────────────────────────
function Gate({ onUnlock }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const p = pw.trim()
    if (!p) return toast('Enter the admin password', 'err')
    setBusy(true)
    setAdminPassword(p)
    try {
      await admin.listUsers() // verifies the password
      sessionStorage.setItem(PW_KEY, p)
      onUnlock()
    } catch (err) {
      setAdminPassword('')
      toast(err.message || 'Wrong admin password', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo"><IconLogo /></span>
          <h1>Coldcast Admin</h1>
          <p>Enter the admin password to continue</p>
        </div>
        <form onSubmit={submit}>
          <label>Admin password</label>
          <div className="login-field">
            <IconKeyOutline />
            <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password" />
          </div>
          <button type="submit" className="btn btn-p login-btn" disabled={busy}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
          <p className="login-foot">Not an admin? <a href="#/salesnav" style={{ color: 'var(--brand)' }}>Go to the dashboard</a></p>
        </form>
      </div>
    </div>
  )
}

// ── create-user form ─────────────────────────────────────────────────────────
function CreateUser({ onCreated }) {
  const [username, setUsername] = useState('')
  const [days, setDays] = useState('30')
  const [busy, setBusy] = useState(false)
  const [issuedKey, setIssuedKey] = useState('')
  const toast = useToast()

  const create = async () => {
    const name = username.trim()
    if (!name) return toast('Enter a username', 'err')
    setBusy(true)
    try {
      const d = await admin.register({ username: name, days: Number(days) || 30 })
      setIssuedKey(d.key || '')
      setUsername('')
      toast('User created', 'ok')
      onCreated()
    } catch (e) {
      toast(e.message || 'Could not create user', 'err')
    } finally {
      setBusy(false)
    }
  }

  const copyKey = () =>
    navigator.clipboard?.writeText(issuedKey).then(() => toast('Key copied', 'ok')).catch(() => toast('Copy failed', 'err'))

  return (
    <div className="sbox">
      <div className="sbox-h">
        <div className="sbox-ic"><IconPlus /></div>
        <h3>Create user</h3>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label className="adm-l">Username</label>
          <input type="text" className="adm-inp" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. acme-corp" onKeyDown={(e) => e.key === 'Enter' && create()} />
        </div>
        <div style={{ flex: '0 0 120px' }}>
          <label className="adm-l">Days</label>
          <input type="number" className="adm-inp" value={days} onChange={(e) => setDays(e.target.value)} min="1" />
        </div>
        <button className="btn btn-p" onClick={create} disabled={busy}>
          <IconPlus /> {busy ? 'Creating…' : 'Create'}
        </button>
      </div>

      {issuedKey && (
        <div style={{ marginTop: 16 }}>
          <div className="setup-note" style={{ marginBottom: 8 }}>
            ⚠ Copy this key now — it's shown <b>once</b>. Hand it to the user to paste into their extension / dashboard.
          </div>
          <div className="key-box">
            <div className="key-val">{issuedKey}</div>
            <button className="btn btn-p" onClick={copyKey}><IconCopy /> Copy</button>
            <button className="btn btn-g" onClick={() => setIssuedKey('')}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── main page ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const refresh = useCallback(async () => {
    try {
      const d = await admin.listUsers()
      setUsers(Array.isArray(d?.users) ? d.users : [])
    } catch (e) {
      toast(e.message || 'Could not load users', 'err')
      if (/admin password|forbidden|403/i.test(e.message || '')) {
        sessionStorage.removeItem(PW_KEY)
        setAdminPassword('')
        setAuthed(false)
      }
    }
  }, [toast])

  // restore a saved session
  useEffect(() => {
    const saved = sessionStorage.getItem(PW_KEY)
    if (!saved) { setLoading(false); return }
    setAdminPassword(saved)
    admin
      .listUsers()
      .then((d) => { setUsers(Array.isArray(d?.users) ? d.users : []); setAuthed(true) })
      .catch(() => { sessionStorage.removeItem(PW_KEY); setAdminPassword('') })
      .finally(() => setLoading(false))
  }, [])

  const lock = () => {
    sessionStorage.removeItem(PW_KEY)
    setAdminPassword('')
    setAuthed(false)
    setUsers([])
  }

  const onUnlock = async () => { setAuthed(true); await refresh() }

  // actions
  const extend = async (u) => {
    const d = window.prompt(`Extend "${u.username}" by how many days?`, '30')
    if (d === null) return
    try { await admin.extend(u.id, Number(d) || 0); toast('Extended', 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }
  const renew = async (u) => {
    const d = window.prompt(`Renew "${u.username}" for how many days (resets the clock from today)?`, '30')
    if (d === null) return
    try { await admin.renew(u.id, Number(d) || 0); toast('Renewed', 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }
  const toggle = async (u) => {
    try { await admin.setDisabled(u.id, !u.disabled); toast(u.disabled ? 'Enabled' : 'Disabled', 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }
  const remove = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? Their job data is NOT deleted, but they lose access.`)) return
    try { await admin.remove(u.id); toast('User deleted', 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }

  if (loading) return <div className="boot"><span className="spin" /><span>Loading…</span></div>
  if (!authed) return <><Gate onUnlock={onUnlock} /><AdminStyles /></>

  return (
    <>
      <header className="topbar">
        <div className="tb-brand"><div className="tb-logo"><IconLogo /></div><h1>Coldcast Admin</h1></div>
        <div className="tb-right">
          <a className="btn btn-g btn-sm" href="#/salesnav">← Dashboard</a>
          <button className="btn btn-g btn-sm" onClick={lock}><IconSignout /> Lock</button>
        </div>
      </header>

      <main className="mn">
        <div className="cnt">
          <CreateUser onCreated={refresh} />

          <div className="sbox">
            <div className="sbox-h">
              <div className="sbox-ic"><IconKeyOutline /></div>
              <h3>Users <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 13 }}>({users.length})</span></h3>
            </div>
            {users.length === 0 ? (
              <div className="profile-empty">No users yet. Create one above.</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr><th>Username</th><th>Created</th><th>Expires</th><th>Status</th><th>Profiles</th><th className="adm-actions-h">Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const st = statusOf(u)
                      return (
                        <tr key={u.id}>
                          <td className="adm-name">{u.username}</td>
                          <td>{fmtDate(u.createdAt)}</td>
                          <td>{fmtDate(u.expiresAt)}</td>
                          <td><span className="adm-badge" style={{ color: st.color, background: st.color + '18' }}>{st.label}</span></td>
                          <td>{Array.isArray(u.profiles) ? u.profiles.length : 0}</td>
                          <td>
                            <div className="adm-actions">
                              <button className="btn btn-g btn-sm" onClick={() => extend(u)}>Extend</button>
                              <button className="btn btn-g btn-sm" onClick={() => renew(u)}>Renew</button>
                              <button className="btn btn-g btn-sm" onClick={() => toggle(u)}>{u.disabled ? 'Enable' : 'Disable'}</button>
                              <button className="btn btn-d btn-sm" onClick={() => remove(u)}><IconTrash /> Del</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      <AdminStyles />
    </>
  )
}

function AdminStyles() {
  return (
    <style>{`
      .adm-l{display:block;font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.6px}
      .adm-inp{width:100%;padding:10px 13px;background:var(--bg);border:1px solid var(--border-strong);border-radius:10px;color:var(--text);font:inherit;font-size:14px;outline:none}
      .adm-inp:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(99,102,241,.15)}
      .adm-table-wrap{overflow-x:auto;margin-top:6px}
      .adm-table{width:100%;border-collapse:collapse;font-size:13px}
      .adm-table th{text-align:left;padding:8px 12px;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--text-dim);font-weight:700;border-bottom:1px solid var(--border)}
      .adm-table td{padding:11px 12px;border-bottom:1px solid var(--border);color:var(--text-muted);white-space:nowrap}
      .adm-table tr:hover td{background:var(--bg-elev-2)}
      .adm-name{font-weight:700;color:var(--text)}
      .adm-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700}
      .adm-actions{display:flex;gap:6px;justify-content:flex-end}
      .adm-actions-h{text-align:right}
    `}</style>
  )
}
