import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { getProduct } from '../lib/products.js'
import { waLink } from '../lib/whatsapp.js'
import { IconKeyOutline, IconSignout, IconWhatsApp } from '../lib/icons.jsx'

// Topbar icons — ported VERBATIM from the approved mockup (bare <svg>, CSS-sized).
const IcBars = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
const IcBolt = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
const IcCal = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
const IcHelp = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M9.5 9.5a2.5 2.5 0 013.8-1.8c1.6.9 1 2.7-.3 3.3-.8.4-1 .8-1 1.5M12 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
const IcBell = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>

// Breadcrumb labels — mirror the sidebar's (mockup) labels EXACTLY so the crumb never
// disagrees with the nav item you clicked. Product routes use the short mockup names, not
// products.js navLabel (which differs, e.g. "LinkedIn Sales Navigator").
const PAGE_NAMES = {
  home: 'Dashboard', set: 'Settings', setup: 'Setup', api: 'API key', ext: 'Extension',
  services: 'Done-for-you', billing: 'Billing',
  salesnav: 'Sales Navigator', company: 'Sales Nav Accounts', apollo: 'Apollo',
  zoominfo: 'ZoomInfo', lisearch: 'LinkedIn Search', post: 'Post Engagers',
  linkedin: 'LinkedIn URL Enrich', waterfall: 'Waterfall Enrich', verify: 'Email Verify',
  domain: 'AI SDR · Domain',
  sndeal: 'Sales Nav Deal', prospectteam: 'Hire Prospect Team', coldinfra: 'Cold Infrastructure',
  requestfeature: 'Request Feature', playbook: 'Free Playbook',
}
const pageName = (route) => PAGE_NAMES[route] || getProduct(route)?.navLabel || getProduct(route)?.label || 'Dashboard'

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

export default function Topbar({ route, nav, onLogout, onGuide }) {
  const { me, browserConnected, credits, usage, localAccountMismatch, expired } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const username = me?.user?.username || '—'
  const secondsLeft = me?.secondsLeft ?? 0

  // Scrape budget — one row allowance shared across ALL scrapers. Fills live as a job runs.
  const scrapeLimit = usage?.limit ?? 0
  const scrapeUsed = usage?.used ?? 0
  const scrapePct = scrapeLimit > 0 ? Math.min(100, (scrapeUsed / scrapeLimit) * 100) : 0
  const scrapeLeft = Math.max(0, scrapeLimit - scrapeUsed)
  const scrapeBar = scrapePct >= 100 ? '#dc2626' : scrapePct >= 90 ? '#d97706' : '#6366f1'
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
    ? `Scraping rows — ${scrapeUsed.toLocaleString()} used of ${scrapeLimit.toLocaleString()} (${scrapePct.toFixed(0)}%) · ${scrapeLeft.toLocaleString()} left. Shared across ALL your scrapers. ${resetsDaily ? `Resets in ${resetTxt} (daily 00:00 UTC).` : 'Total allowance (no daily reset).'}`
    : 'Scrape limit not loaded — check you are logged in and the scraper API is reachable.'

  const creditBal = credits ?? 0
  const lowCredits = creditBal > 0 && creditBal < 50
  const daysLeft = secondsLeft > 0 ? Math.ceil(secondsLeft / 86400) : 0
  const lowDays = daysLeft > 0 && daysLeft <= 3

  const connText = expired ? 'Expired'
    : localAccountMismatch ? 'Different account'
    : browserConnected ? 'Connected' : 'Not connected'
  const connLive = browserConnected && !localAccountMismatch && !expired

  return (
    <header className="topbar">
      <div className="tb-crumb">
        <span className="home" onClick={() => nav('home')}>Coldcast</span>
        <span className="sl">/</span>
        <b>{pageName(route)}</b>
      </div>
      <div className="tb-spacer" />

      <div className="tb-res">
        <div className="tb-cell" title={scrapeTitle}>
          <IcBars />
          <span className="n">{scrapeLeft.toLocaleString()}</span><span className="u">scrapes</span>
          <span className="tb-track"><i style={{ width: scrapePct.toFixed(1) + '%', background: scrapeBar }} /></span>
        </div>
        <span className="tb-divx" />
        <div className="tb-cell credits" title="Email credits — for enrichment & verification. 1 credit = 1 valid email · 2 verifications · ⅓ of a domain/LinkedIn enrichment.">
          <IcBolt />
          <span className={'n' + (lowCredits ? ' warn' : '')}>{creditBal.toLocaleString()}</span><span className="u">credits</span>
        </div>
        {/* Days-left moved to the sidebar account card. Expiry still surfaces via the
            connection pill ("Expired") + the account-menu TTL. */}
      </div>

      <button
        className={'tb-conn' + ((expired || localAccountMismatch) ? ' mismatch' : '')}
        onClick={() => nav('set')}
        title={expired ? 'Account expired — renew to run jobs.'
          : localAccountMismatch ? 'This browser’s extension is signed in with a different Coldcast account.'
          : `${connText} · manage extensions`}
        aria-label={`Extensions: ${connText}`}
      >
        <span className={'d' + (connLive ? '' : ' off')} />
        <span className="tb-conn-t">{connText}</span>
      </button>

      {onGuide && (
        <button className="tb-ticon" onClick={onGuide} title="Help & setup guide" aria-label="Help">
          <IcHelp />
        </button>
      )}
      <button className="tb-ticon" onClick={() => toast('You’re all caught up — no new notifications.', 'info')} title="Notifications" aria-label="Notifications">
        <IcBell />
      </button>

      <div className="acct" ref={ref}>
        <button
          className="tb-me"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
          title={username}
          aria-label="Account menu"
        >
          {(username[0] || '?').toUpperCase()}
        </button>

        <div className={'acct-menu' + (open ? ' on' : '')}>
          <div className="ttl">{fmtTtl(secondsLeft)}</div>
          <button className="acct-item" onClick={() => { setOpen(false); nav('api') }}>
            <IconKeyOutline /> API key
          </button>
          <a
            className="acct-item"
            href={waLink('Hi! I’d like to book a demo of Coldcast.')}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            <IconWhatsApp /> Book a demo
          </a>
          <a
            className="acct-item"
            href={waLink('Hi! I have a question about Coldcast.')}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            <IconWhatsApp /> WhatsApp us
          </a>
          <div className="acct-sep" />
          <button className="acct-item danger" onClick={() => { setOpen(false); onLogout() }}>
            <IconSignout /> Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
