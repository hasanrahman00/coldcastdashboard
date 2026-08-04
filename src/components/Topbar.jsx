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
  IconCalendar,
  IconDownload,
  IconWhatsApp,
  IconPuzzle,
} from '../lib/icons.jsx'
import StatsBox from './StatsBox.jsx'
import { waLink } from '../lib/whatsapp.js'

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
  const { me, uiConfig, browserConnected, credits, usage, localAccountMismatch, expired } = useApp()
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

  // Account validity — days until this account/plan expires. `secondsLeft` (declared above)
  // is recomputed from expiresAt and ticks down live (AppStore). Ceil so the final partial
  // day still reads "1 day left" instead of 0.
  const daysLeft = secondsLeft > 0 ? Math.ceil(secondsLeft / 86400) : 0
  const lowDays = daysLeft > 0 && daysLeft <= 3

  // Connection status — shown ONCE here (the middle strip no longer duplicates it). Reads the
  // SAME this-browser signal the page banners use (browserConnected), so the pill can't say
  // "0/2 connected" while a page says this browser isn't connected. "Different account"
  // (extension connected under another Coldcast login in this browser) wins over connected/not.
  const connText = expired
    ? 'Expired'
    : localAccountMismatch ? 'Different account'
    : browserConnected ? 'Connected' : 'Not connected'


  return (
    <header className="topbar">
      <StatsBox />

      <div className="tb-right">
        {/* One calm, neutral container holds all account resources — scrape budget,
            credits, and (when applicable) the reset countdown — instead of three
            competing colored pills. Accent shows only in the tiny progress track. */}
        <div className="usage-group">
          {resetsDaily && (
            <>
              <span className="ug-chip ug-reset" title={`Scraping limit resets in ${resetTxt} — daily at 00:00 UTC`}>
                <IconClock />
                <span className="ug-val muted">{resetTxt}<em> reset</em></span>
              </span>
              <span className="ug-div ug-div-reset" />
            </>
          )}

          <span className="ug-chip" title={scrapeTitle}>
            <IconChartBar />
            <span className="ug-col">
              <span className="ug-val">
                {scrapeLeft.toLocaleString()}
                <em> scrapes left</em>
              </span>
              <span className="ug-track">
                <i style={{ width: scrapePct.toFixed(1) + '%', background: scrapeBar }} />
              </span>
            </span>
          </span>

          <span className="ug-div" />

          <span
            className="ug-chip"
            title="Email credits — for enrichment & verification. 1 credit = 1 valid email · 2 verifications · ⅓ of a domain/LinkedIn enrichment (3 credits each)"
          >
            <IconZap />
            <span className={'ug-val' + (lowCredits ? ' warn' : '')}>
              {creditBal.toLocaleString()}<em> credits</em>
            </span>
          </span>

          {expired ? (
            <>
              <span className="ug-div" />
              <span className="ug-chip" title="Your account has expired — renew to run jobs">
                <IconCalendar />
                <span className="ug-val warn">Expired</span>
              </span>
            </>
          ) : daysLeft > 0 && (
            <>
              <span className="ug-div" />
              <span
                className="ug-chip"
                title={me?.expiresAt
                  ? `Account expires ${new Date(me.expiresAt).toLocaleDateString()} · ${fmtTtl(secondsLeft)}`
                  : 'Days left on your account'}
              >
                <IconCalendar />
                <span className={'ug-val' + (lowDays ? ' warn' : '')}>
                  {daysLeft.toLocaleString()}<em> day{daysLeft === 1 ? '' : 's'} left</em>
                </span>
              </span>
            </>
          )}
        </div>

        {/* Connection status lives here and ONLY here now. */}
        <button
          className={'conn-pill' + ((expired || localAccountMismatch) ? ' mismatch' : '')}
          onClick={() => nav('set')}
          title={expired
            ? 'Your account has expired — renew to run jobs. You can still view your data.'
            : localAccountMismatch
            ? 'This browser’s extension is signed in with a different Coldcast account — open the extension and paste THIS account’s API key'
            : `${connText} · manage extensions`}
          aria-label={`Extensions: ${connText}`}
        >
          <span className={'dot' + (browserConnected && !localAccountMismatch && !expired ? '' : ' off')} />
          <span>{connText}</span>
        </button>

        <a
          className="tb-demo"
          href={waLink('Hi! I’d like to book a demo of Coldcast.')}
          target="_blank"
          rel="noopener noreferrer"
          title="Book a demo on WhatsApp"
        >
          <IconWhatsApp /> <span className="tb-demo-t">Demo</span>
        </a>

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
            {onGuide && (
              <button className="acct-item" onClick={() => { setOpen(false); onGuide() }}>
                <IconPuzzle /> Setup guide
              </button>
            )}
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
