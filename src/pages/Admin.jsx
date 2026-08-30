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

// Days remaining until the account expires.
function daysLeft(u) {
  if (!u.expiresAt) return '—'
  const ms = new Date(u.expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const d = Math.ceil(ms / 86400000)
  return d === 1 ? '1 day' : `${d} days`
}

function shortKey(k) {
  if (!k) return ''
  return k.length > 14 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k
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
  const [email, setEmail] = useState('')
  const [days, setDays] = useState('30')
  const [busy, setBusy] = useState(false)
  const [issuedKey, setIssuedKey] = useState('')
  const toast = useToast()

  const create = async () => {
    const name = username.trim()
    if (!name) return toast('Enter a username', 'err')
    setBusy(true)
    try {
      const d = await admin.register({ username: name, days: Number(days) || 30, email: email.trim() })
      setIssuedKey(d.key || '')
      setUsername('')
      setEmail('')
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
        <div style={{ flex: '1 1 190px' }}>
          <label className="adm-l">Username</label>
          <input type="text" className="adm-inp" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. acme-corp" onKeyDown={(e) => e.key === 'Enter' && create()} />
        </div>
        <div style={{ flex: '1 1 190px' }}>
          <label className="adm-l">Email <span style={{ textTransform: 'none', fontWeight: 500, color: 'var(--text-faint)' }}>(optional)</span></label>
          <input type="email" className="adm-inp" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" onKeyDown={(e) => e.key === 'Enter' && create()} />
        </div>
        <div style={{ flex: '0 0 90px' }}>
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
  const [proxy, setProxy] = useState(null)
  const [proxyTest, setProxyTest] = useState(null)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  // End-to-end: lease a proxy like the scraper does, prove egress, release.
  const runProxyTest = async () => {
    setTesting(true); setProxyTest(null)
    try {
      const r = await admin.proxySelfTest()
      setProxyTest(r)
      toast(r.routed ? 'Proxy routing OK ✓' : (r.proxy === null ? 'No proxy (browser-mode)' : 'Test done'), r.routed ? 'ok' : 'err')
    } catch (e) { toast(e.message, 'err') } finally { setTesting(false) }
  }

  const refresh = useCallback(async () => {
    // Proxy pool health — best-effort, never blocks the user table.
    admin.proxyStatus().then(setProxy).catch(() => {})
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
      .then((d) => { setUsers(Array.isArray(d?.users) ? d.users : []); setAuthed(true); admin.proxyStatus().then(setProxy).catch(() => {}) })
      .catch(() => { sessionStorage.removeItem(PW_KEY); setAdminPassword('') })
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh while authed: re-fetch every 30s (and on focus), paused when
  // the tab is hidden. Keeps "Days left" current and surfaces new signups
  // without a manual reload.
  useEffect(() => {
    if (!authed) return
    const tick = () => { if (!document.hidden) refresh() }
    const t = setInterval(tick, 30000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [authed, refresh])

  const lock = () => {
    sessionStorage.removeItem(PW_KEY)
    setAdminPassword('')
    setAuthed(false)
    setUsers([])
  }

  const onUnlock = async () => { setAuthed(true); await refresh() }

  // actions
  const remove = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? Their job data is NOT deleted, but they lose access.`)) return
    try { await admin.remove(u.id); toast('User deleted', 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }
  const copyKey = (key) => {
    if (!key) return
    navigator.clipboard?.writeText(key).then(() => toast('API key copied', 'ok')).catch(() => toast('Copy failed', 'err'))
  }
  // Top up (or set) a user's credit wallet for email enrich / verify / domain.
  const editCredits = async (u) => {
    const v = window.prompt(`Credits for "${u.username}" (enrich / verify / domain):`, String(u.credits ?? ''))
    if (v === null) return
    const n = parseInt(v, 10)
    if (isNaN(n) || n < 0) return toast('Enter a valid number', 'err')
    try { await admin.setCredits(u.id, n); toast('Credits updated', 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }
  // Grant prepaid SCRAPE credits (the $3 / 10,000 pack) — ADDS to the balance.
  const grantScrape = async (u) => {
    const v = window.prompt(`ADD scrape credits to "${u.username}" (10,000 = one $3 pack).\nCurrent balance: ${(u.scrapeCredits ?? 0).toLocaleString()}`, '10000')
    if (v === null) return
    const n = parseInt(v, 10)
    if (isNaN(n) || n <= 0) return toast('Enter a positive number', 'err')
    try { await admin.grantScrapeCredits(u.id, n); toast(`Granted ${n.toLocaleString()} scrape credits`, 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }
  // Switch a user between Free (1,000 rows / 1 day) and Paid (20,000 rows / 30 days).
  // Refreshes their allowance and restarts the clock from today.
  const changePlan = async (u, plan) => {
    if (plan === (u.trial ? 'free' : 'paid')) return
    const label = plan === 'paid' ? 'Paid — 20,000 rows / 30 days' : 'Free — 100 rows / 1 day'
    if (!window.confirm(`Switch "${u.username}" to ${label}?\n\nThis refreshes their row allowance and restarts the clock from today.`)) {
      refresh() // user cancelled — re-sync the dropdown to the real value
      return
    }
    try { await admin.setPlan(u.id, plan); toast(`Switched to ${plan === 'paid' ? 'Paid' : 'Free'}`, 'ok'); refresh() }
    catch (e) { toast(e.message, 'err'); refresh() }
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
          {proxy && proxy.shortage > 0 && (
            <div className="proxy-alert">
              <span className="proxy-alert-ic">⚠</span>
              <div className="proxy-alert-body">
                <strong>Buy {proxy.shortage} more {proxy.shortage === 1 ? 'proxy' : 'proxies'}.</strong>
                {' '}{proxy.paidActive} paying {proxy.paidActive === 1 ? 'user' : 'users'} · {proxy.alive}/{proxy.total} live in pool
                {' '}({proxy.owned} dedicated, {proxy.idle} idle). Waiting users borrow a spare per run until you top up.
              </div>
            </div>
          )}
          {proxy && proxy.shortage === 0 && proxy.total > 0 && (
            <div className="proxy-ok">
              🛰️ Proxy pool healthy — {proxy.alive}/{proxy.total} live · {proxy.owned} dedicated to {proxy.paidActive} paying {proxy.paidActive === 1 ? 'user' : 'users'} · {proxy.idle} idle.
            </div>
          )}
          {proxy && proxy.total > 0 && (
            <div className="proxy-test">
              <button className="btn btn-g btn-sm" onClick={runProxyTest} disabled={testing}>
                {testing ? 'Testing…' : '🧪 Test proxy lease'}
              </button>
              {proxyTest && (
                <span className="proxy-test-r">
                  {proxyTest.proxy === null
                    ? `— ${proxyTest.note || 'no proxy'}`
                    : proxyTest.routed
                      ? `✓ routed — user ${proxyTest.userId} → ${proxyTest.proxyId} → exit IP ${proxyTest.exitIp}`
                      : `✗ not routed (exit ${proxyTest.exitIp || 'n/a'}, core ${proxyTest.coreIp || 'n/a'})${proxyTest.error ? ' · ' + proxyTest.error : ''}`}
                </span>
              )}
            </div>
          )}
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
                    <tr><th>Username</th><th>Email</th><th>Created</th><th>Plan</th><th>Scrape cr</th><th>Credits</th><th>Status</th><th>API key</th><th className="adm-actions-h">Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const st = statusOf(u)
                      return (
                        <tr key={u.id}>
                          <td className="adm-name">{u.username}</td>
                          <td className="adm-emailcell">{u.email || <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                          <td>{fmtDate(u.createdAt)}</td>
                          <td>
                            <select
                              className={'adm-plan adm-plan-' + (u.trial ? 'free' : 'paid')}
                              value={u.trial ? 'free' : 'paid'}
                              onChange={(e) => changePlan(u, e.target.value)}
                              title="Switch between Free (1,000 rows / 1 day) and Paid (20,000 rows / 30 days)"
                            >
                              <option value="free">Free</option>
                              <option value="paid">Paid</option>
                            </select>
                          </td>
                          <td>
                            <button className="adm-limit" onClick={() => grantScrape(u)} title="Click to ADD prepaid scrape credits (10,000 = one $3 pack)">
                              {(u.scrapeCredits ?? 0).toLocaleString()}<span className="adm-limit-edit"> scr ✎</span>
                            </button>
                          </td>
                          <td>
                            <button className="adm-limit" onClick={() => editCredits(u)} title="Click to top up the credit wallet (enrich / verify / domain)">
                              {(u.credits ?? 0).toLocaleString()}<span className="adm-limit-edit"> cr ✎</span>
                            </button>
                          </td>
                          <td><span className="adm-badge" style={{ color: st.color, background: st.color + '18' }}>{st.label}</span></td>
                          <td>
                            {u.key ? (
                              <span className="adm-key">
                                <code>{shortKey(u.key)}</code>
                                <button className="adm-key-btn" title="Copy API key" onClick={() => copyKey(u.key)}><IconCopy /></button>
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-faint)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <div className="adm-actions">
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
      .adm-trial{margin-left:8px;display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#0e7490;background:rgba(8,145,178,.12)}
      .adm-plan{border-radius:8px;font-size:12px;font-weight:700;padding:4px 8px;cursor:pointer;border:1px solid var(--border-strong);background:var(--bg-elev-2);color:var(--text);font-family:inherit}
      .adm-plan:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(99,102,241,.15)}
      .adm-plan-free{color:#0e7490}
      .adm-plan-paid{color:#047857}
      .adm-emailcell{color:var(--text-muted)}
      .adm-days{font-weight:600;color:var(--text);white-space:nowrap}
      .adm-key{display:inline-flex;align-items:center;gap:6px}
      .adm-key code{font-family:var(--mono);font-size:11.5px;color:var(--text-muted);background:var(--bg-elev-2);padding:3px 8px;border-radius:6px;white-space:nowrap}
      .adm-key-btn{display:inline-grid;place-items:center;width:26px;height:26px;border:none;border-radius:7px;background:var(--brand-grad);color:#fff;cursor:pointer;flex-shrink:0}
      .adm-key-btn svg{width:13px;height:13px}
      .adm-limit{background:none;border:none;cursor:pointer;font:inherit;color:var(--text);font-weight:600;padding:0;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
      .adm-limit:hover{color:var(--brand)}
      .adm-limit-edit{font-size:10px;color:var(--text-faint);font-weight:600}
      .adm-spent{display:inline-flex;align-items:center;gap:5px;color:var(--text-muted);font-weight:600;white-space:nowrap}
      .adm-actions{display:flex;gap:6px;justify-content:flex-end}
      .adm-actions-h{text-align:right}
      .proxy-alert{display:flex;gap:12px;align-items:flex-start;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.35);border-radius:12px;padding:13px 16px;margin-bottom:16px}
      .proxy-alert-ic{font-size:18px;line-height:1.2;flex-shrink:0}
      .proxy-alert-body{font-size:13px;line-height:1.5;color:var(--text)}
      .proxy-alert-body strong{color:#d97706}
      .proxy-ok{font-size:12.5px;color:var(--text-muted);background:var(--bg-elev-2);border:1px solid var(--border);border-radius:10px;padding:9px 14px;margin-bottom:16px}
      .proxy-test{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:-6px 0 16px}
      .proxy-test-r{font-size:12px;color:var(--text-muted);font-family:var(--mono)}
    `}</style>
  )
}
