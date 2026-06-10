import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { IconLogo, IconGear, IconChevronDown, IconKeyOutline, IconSignout } from '../lib/icons.jsx'

function fmtTtl(secs) {
  if (secs <= 0) return 'Expired'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d >= 1) return `${d}d ${h}h left`
  if (h >= 1) return `${h}h ${m}m left`
  if (m >= 1) return `${m}m ${s}s left`
  return `${s}s left`
}

export default function Topbar({ route, nav, onLogout }) {
  const { me, uiConfig, connectorOnline } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const username = me?.user?.username || '—'
  const secondsLeft = me?.secondsLeft ?? 0

  return (
    <header className="topbar">
      <div className="tb-brand" onClick={() => nav('salesnav')} title="Dashboard">
        <div className="tb-logo">
          <IconLogo />
        </div>
        <h1>Coldcast</h1>
      </div>

      <div className="tb-right">
        <span className="conn-pill">
          <span className={'dot' + (connectorOnline ? '' : ' off')} />
          <span>{connectorOnline ? 'Extension connected' : 'Extension not connected'}</span>
        </span>

        <button className="tb-icon" onClick={() => nav('set')} title="Settings">
          <IconGear />
        </button>

        <div className="acct" ref={ref}>
          <button
            className="acct-btn"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
          >
            <span className="avatar">{(username[0] || '?').toUpperCase()}</span>
            <span className="uname">{username}</span>
            <IconChevronDown className="chev" />
          </button>

          <div className={'acct-menu' + (open ? ' on' : '')}>
            <div className="ttl">{fmtTtl(secondsLeft)}</div>
            {!uiConfig.hideSettings && (
              <button className="acct-item" onClick={() => { setOpen(false); nav('set') }}>
                <IconGear /> Settings
              </button>
            )}
            <button className="acct-item" onClick={() => { setOpen(false); nav('api') }}>
              <IconKeyOutline /> API key
            </button>
            <div className="acct-sep" />
            <button className="acct-item danger" onClick={() => { setOpen(false); onLogout() }}>
              <IconSignout /> Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
