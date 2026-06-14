import { useState } from 'react'
import { getFreeAccount } from '../lib/freeAccounts.js'
import { useToast } from '../store/ToastProvider.jsx'

const LOGIN_URLS = {
  Lusha: 'https://www.lusha.com/login/',
  SalesQL: 'https://salesql.com/',
  ContactOut: 'https://contactout.com/login',
}

// One source card on the Setup page: a "Get a free account" button that pulls a
// fresh login from the Google Sheet (via the /api/free-account serverless fn),
// then shows the email + password with copy buttons.
export default function FreeAccountCard({ name, source }) {
  const toast = useToast()
  const [acct, setAcct] = useState(null) // { account, password }
  const [loading, setLoading] = useState(false)

  const fetchAccount = async () => {
    setLoading(true)
    try {
      const d = await getFreeAccount(source)
      setAcct({ account: d.account, password: d.password })
    } catch (e) {
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
          Open &amp; log in →
        </a>
      </div>

      {acct ? (
        <div className="fa-creds">
          <div className="fa-row">
            <span className="fa-val">{acct.account}</span>
            <button className="btn btn-g btn-sm" onClick={() => copy(acct.account, 'Email')}>Copy</button>
          </div>
          <div className="fa-row">
            <span className="fa-val">{acct.password}</span>
            <button className="btn btn-g btn-sm" onClick={() => copy(acct.password, 'Password')}>Copy</button>
          </div>
          <button className="fa-again" onClick={fetchAccount} disabled={loading}>
            {loading ? 'Fetching…' : 'Get another'}
          </button>
        </div>
      ) : (
        <button className="btn btn-p btn-sm fa-get" onClick={fetchAccount} disabled={loading}>
          {loading ? 'Fetching…' : 'Get a free account'}
        </button>
      )}

      <style>{`
        .free-acct{display:flex;flex-direction:column;gap:10px}
        .fa-get{align-self:flex-start}
        .fa-creds{display:flex;flex-direction:column;gap:8px}
        .fa-row{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--bg-elev-2);border:1px solid var(--border);border-radius:8px;padding:6px 10px}
        .fa-val{font-family:var(--mono,'JetBrains Mono',monospace);font-size:12.5px;word-break:break-all;color:var(--text)}
        .fa-again{align-self:flex-start;background:none;border:none;color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;padding:0}
      `}</style>
    </div>
  )
}
