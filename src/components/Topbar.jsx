import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { IconLogo, IconGear, IconChevronDown, IconKeyOutline, IconSignout, IconChain } from '../lib/icons.jsx'

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
  const { me, uiConfig, connectorOnline, profiles, credits } = useApp()
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
        <span
          className="credit-pill"
          title="Credits for email enrichment & verification — 1 credit = 1 valid email · 2 verifications · ⅓ of a domain/LinkedIn enrichment (3 credits each)"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
            background: 'rgba(217,119,6,.10)', border: '1px solid rgba(217,119,6,.28)',
            color: '#b45309', fontSize: 13, fontWeight: 700,
          }}
        >
          <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>⚡</span>
          {(credits ?? 0).toLocaleString()} credits
        </span>

        <span className="conn-pill">
          <span className={'dot' + (connectorOnline ? '' : ' off')} />
          <span>
            {/* With several browsers connected, "Extension connected" is
                ambiguous (connected WHERE?) — show the count instead. */}
            {profiles.length > 1
              ? `${profiles.filter((p) => p.online).length}/${profiles.length} extensions connected`
              : connectorOnline ? 'Extension connected' : 'Extension not connected'}
          </span>
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
            <button className="acct-item" onClick={() => { setOpen(false); nav('setup') }}>
              <IconChain /> Setup
            </button>
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
