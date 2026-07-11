import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppStore.jsx'
import {
  IconGear,
  IconChevronDown,
  IconKeyOutline,
  IconSignout,
  IconChain,
  IconChartBar,
  IconZap,
  IconClock,
  IconDownload,
} from '../lib/icons.jsx'
import { getProduct } from '../lib/products.js'

// The left side of the top bar names the current page (the brand now lives in the sidebar).
const PAGE_TITLES = { home: 'Dashboard', set: 'Settings', setup: 'Setup', api: 'API key', ext: 'Browser extension' }

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
  const { me, uiConfig, connectorOnline, profiles, credits, usage } = useApp()
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
  // Scrape budget — ONE row allowance shared across ALL scrapers (Sales Nav,
  // Apollo, ZoomInfo…), separate from the credit wallet. Shown as a live usage
  // bar: it fills (and "left" drops) in real time as a job runs, because
  // AppStore polls /api/agent/status every 8s.
  const scrapeLimit = usage?.limit ?? 0
  const scrapeUsed  = usage?.used ?? 0
  const scrapePct   = scrapeLimit > 0 ? Math.min(100, (scrapeUsed / scrapeLimit) * 100) : 0
  const scrapeLeft  = Math.max(0, scrapeLimit - scrapeUsed)
  const scrapeBar   = scrapePct >= 100 ? '#dc2626' : scrapePct >= 90 ? '#d97706' : '#2563eb'
  // Daily scrape quota resets at 00:00 UTC (PAID accounts only — free = hard total, no
  // reset). Show how long until it refills so users know when they get more rows. The
  // topbar re-renders every second (session countdown), so this recomputes live.
  const resetsDaily = !!usage?.resetsDaily && scrapeLimit > 0
  let resetTxt = ''
  if (resetsDaily) {
    const now = new Date()
    const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    resetTxt = h >= 1 ? `${h}h ${m}m` : `${m}m`
  }

  const scrapeTitle = scrapeLimit > 0
    ? `Scraping rows — ${scrapeUsed.toLocaleString()} used of ${scrapeLimit.toLocaleString()} (${scrapePct.toFixed(0)}%) · ${scrapeLeft.toLocaleString()} left. One budget shared across ALL your scrapers; ticks down live as a job runs. ${resetsDaily ? `Resets in ${resetTxt} — daily at 00:00 UTC.` : 'Total allowance (no daily reset).'}`
    : 'Scrape limit not loaded — check you are logged in and the scraper API is reachable.'
  const creditBal = credits ?? 0
  const lowCredits = creditBal > 0 && creditBal < 50

  // Connection status — shown ONCE here (the middle strip no longer duplicates it).
  const onlineCount = profiles.filter((p) => p.online).length
  const connText = profiles.length > 1
    ? `${onlineCount}/${profiles.length} connected`
    : connectorOnline ? 'Connected' : 'Not connected'

  const pageTitle = PAGE_TITLES[route] || getProduct(route)?.label || 'Dashboard'

  return (
    <header className="topbar">
      <div className="tb-title">{pageTitle}</div>

      <div className="tb-right">
        {/* One calm, neutral container holds all account resources — scrape budget,
            credits, and (when applicable) the reset countdown — instead of three
            competing colored pills. Accent shows only in the tiny progress track. */}
        <div className="usage-group">
          <span className="ug-chip" title={scrapeTitle}>
            <IconChartBar />
            <span className="ug-col">
              <span className="ug-val">
                {scrapeLeft.toLocaleString()}
                <em>{scrapeLimit > 0 ? ` left of ${scrapeLimit.toLocaleString()}` : ' left'}</em>
              </span>
              <span className="ug-track">
                <i style={{ width: scrapePct.toFixed(1) + '%', background: scrapeBar }} />
              </span>
            </span>
          </span>

          <span className="ug-div" />

          <span
            className="ug-chip"
            title="Credits for email enrichment & verification — 1 credit = 1 valid email · 2 verifications · ⅓ of a domain/LinkedIn enrichment (3 credits each)"
          >
            <IconZap />
            <span className={'ug-val' + (lowCredits ? ' warn' : '')}>
              {creditBal.toLocaleString()}<em> credits</em>
            </span>
          </span>

          {resetsDaily && (
            <span className="ug-chip ug-reset" title={`Scrape budget resets in ${resetTxt} — daily at 00:00 UTC`}>
              <IconClock />
              <span className="ug-val muted">{resetTxt}</span>
            </span>
          )}
        </div>

        {/* Connection status lives here and ONLY here now. */}
        <button
          className="conn-pill"
          onClick={() => nav('set')}
          title={`${connText} · manage extensions`}
          aria-label={`Extensions: ${connText}`}
        >
          <span className={'dot' + (connectorOnline ? '' : ' off')} />
          <span>{connText}</span>
        </button>

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
            <button className="acct-item" onClick={() => { setOpen(false); nav('ext') }}>
              <IconDownload /> Get extension
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
