import { useState } from 'react'
import { getFreeAccount } from '../lib/freeAccounts.js'
import { getCachedMe } from '../lib/api.js'
import { useToast } from '../store/ToastProvider.jsx'

const LOGIN_URLS = {
  Lusha: 'https://www.lusha.com/login/',
  SignalHire: 'https://www.signalhire.com/',
  SalesQL: 'https://salesql.com/',
  ContactOut: 'https://contactout.com/login',
}

// Persist the last fetched account per source so it survives page reloads. SCOPED per
// user — localStorage is browser-global, so without the user id a different account on the
// same browser would see the previous user's fetched credentials.
const storeKey = (source) => `cc_free_acct_${source}_${(getCachedMe()?.user?.id) || 'anon'}`
function loadStored(source) {
  try {
    localStorage.removeItem(`cc_free_acct_${source}`) // drop the legacy browser-global key (held another user's creds)
    return JSON.parse(localStorage.getItem(storeKey(source)) || 'null')
  } catch { return null }
}

// One source card on the Setup page. First click "Get a free account" → reveals
// email + password (persisted). After that the button becomes "Refetch", which
// pulls a fresh account and REPLACES the shown one (e.g. if it didn't work).
export default function FreeAccountCard({ name, source, warn }) {
  const toast = useToast()
  const [acct, setAcct] = useState(() => loadStored(source))
  const [loading, setLoading] = useState(false)

  const fetchAccount = async () => {
    setLoading(true)
    try {
      const d = await getFreeAccount(source)
      const next = { account: d.account, password: d.password }
      setAcct(next)
      try { localStorage.setItem(storeKey(source), JSON.stringify(next)) } catch { /* quota */ }
    } catch (e) {
      // keep the existing account on failure so the user doesn't lose it
      toast(e.message || 'Could not fetch an account', 'err')
    } finally {
      setLoading(false)
    }
  }

  const copy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => toast(label + ' copied', 'ok')).catch(() => {})
  }

  return (
    <div className="enrich-card free-acct">
      <div className="enrich-h">
        <b>{name}</b>
        <a className="enrich-action" href={LOGIN_URLS[name]} target="_blank" rel="noopener noreferrer">
          Open {name} →
        </a>
      </div>

      {warn && <p className="fa-warn">⚠ {warn}</p>}

      {acct ? (
        <div className="fa-creds">
          <div className="fa-row">
            <div className="fa-field">
              <span className="fa-label">Email</span>
              <span className="fa-val">{acct.account}</span>
            </div>
            <button className="btn btn-g btn-sm" onClick={() => copy(acct.account, 'Email')}>Copy</button>
          </div>
          <div className="fa-row">
            <div className="fa-field">
              <span className="fa-label">Password</span>
              <span className="fa-val">{acct.password}</span>
            </div>
            <button className="btn btn-g btn-sm" onClick={() => copy(acct.password, 'Password')}>Copy</button>
          </div>
          <button className="btn btn-g btn-sm fa-get" onClick={fetchAccount} disabled={loading} title="Get a new account, replacing this one">
            {loading ? 'Fetching…' : 'Refetch'}
          </button>
        </div>
      ) : (
        <button className="btn btn-p btn-sm fa-get" onClick={fetchAccount} disabled={loading}>
          {loading ? 'Fetching…' : 'Get a free account'}
        </button>
      )}

      <style>{`
        .free-acct{display:flex;flex-direction:column;gap:12px}
        .fa-warn{margin:0;font-size:12px;font-weight:600;color:var(--amber);line-height:1.45;background:var(--amberglow);border:1px solid color-mix(in srgb,var(--amber) 26%,var(--border));border-radius:9px;padding:8px 11px}
        .fa-get{align-self:flex-start}
        .fa-creds{display:flex;flex-direction:column;gap:8px}
        .fa-row{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--bg-elev-1);border:1px solid var(--border);border-radius:9px;padding:8px 11px}
        .fa-field{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
        .fa-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-dim)}
        .fa-val{font-family:var(--mono);font-size:12.5px;word-break:break-all;color:var(--text)}
      `}</style>
    </div>
  )
}
