import { useApp } from '../store/AppStore.jsx'
import { IconLogo, IconChevronDown } from '../lib/icons.jsx'
import { NavIcon } from '../lib/navicons.jsx'

// Nav model — built EXACTLY like the mockup. `route` is the real Dashboard.jsx route; a
// `placeholder` item is a mockup entry with no page yet (parked on 'home' until mapped).
const PRIMARY = [
  { key: 'dashboard', route: 'home', label: 'Dashboard' },
  { key: 'workbench', route: 'home', label: 'Workbench', placeholder: true },
  { key: 'leads', route: 'home', label: 'Leads', placeholder: true },
]
const SCRAPERS = [
  { key: 'salesnav', route: 'salesnav', label: 'Sales Navigator' },
  { key: 'company', route: 'company', label: 'Sales Nav Accounts' },
  { key: 'apollofree', route: 'apollofree', label: 'Apollo Free' },
  { key: 'zoominfo', route: 'zoominfo', label: 'ZoomInfo' },
  { key: 'lisearch', route: 'lisearch', label: 'LinkedIn Search' },
  { key: 'post', route: 'post', label: 'Post Engagers' },
]
const ENRICHMENT = [
  { key: 'linkedin', route: 'linkedin', label: 'LinkedIn URL Enrich' },
  { key: 'waterfall', route: 'waterfall', label: 'Waterfall Enrich' },
  { key: 'verify', route: 'verify', label: 'Email Verify' },
  { key: 'domain', route: 'domain', label: 'AI SDR · Domain', tag: 'AI' },
]
const SERVICES = [
  { key: 'doneforyou', route: 'services', label: 'Done-for-you' },
]
// "Done-for-you" lights up on the services hub AND any individual service page it links to
// (the Sales Nav Deal now lives INSIDE the hub, not as its own sidebar item).
const SVC_FAMILY = new Set(['services', 'sndeal', 'prospectteam', 'coldinfra', 'requestfeature', 'playbook'])
const FOOTER = [
  { key: 'ext', route: 'ext', label: 'Extension' },
  { key: 'billing', route: 'billing', label: 'Billing' },
  { key: 'settings', route: 'set', label: 'Settings' },
]

export default function Sidebar({ route, nav }) {
  const { me, jobs, companyJobs, apolloFreeJobs, zoominfoJobs, lisearchJobs, postJobs, enricherJobs, domainJobs } = useApp()
  const username = me?.user?.username || 'Account'
  // secondsLeft === null → time-expiry disabled (pay-as-you-go); show just the plan, no countdown.
  const noExpiry = me?.secondsLeft == null
  const secondsLeft = me?.secondsLeft ?? 0
  // Account card subline. We're credit-based now — no Free/Paid plan, just "Pay as you go".
  // (When time-expiry is enabled we still show the countdown; by default it's off.)
  const daysLeft = secondsLeft > 0 ? Math.ceil(secondsLeft / 86400) : 0
  const planLine = noExpiry
    ? 'Pay as you go'
    : (me?.user?.expired || daysLeft <= 0)
      ? 'Access expired'
      : `Pay as you go · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`

  const counts = {
    salesnav: (jobs || []).length, company: (companyJobs || []).length,
    apollofree: (apolloFreeJobs || []).length,
    zoominfo: (zoominfoJobs || []).length, lisearch: (lisearchJobs || []).length, post: (postJobs || []).length,
    linkedin: (enricherJobs || []).length, domain: (domainJobs || []).length,
  }

  const item = (it) => {
    const on = it.key === 'doneforyou' ? SVC_FAMILY.has(route) : (route === it.route && !it.placeholder)
    const n = counts[it.key] || 0
    return (
      <button
        key={it.key}
        className={'snav-item' + (on ? ' on' : '')}
        aria-current={on ? 'page' : undefined}
        aria-label={it.label}
        title={it.label}
        onClick={() => nav(it.route)}
      >
        <span className="snav-ic"><NavIcon k={it.key} /></span>
        <span className="snav-label">{it.label}</span>
        {it.tag && <span className={'snav-tag' + (it.deal ? ' deal' : '')}>{it.tag}</span>}
        {!it.tag && n > 0 && <span className="snav-cnt">{n > 999 ? (n / 1000).toFixed(1) + 'k' : n}</span>}
      </button>
    )
  }

  return (
    <aside className="side">
      <div className="side-brand" onClick={() => nav('home')} title="Home">
        <div className="side-logo"><IconLogo /></div>
        <h1>Coldcast</h1>
      </div>

      <button className="side-acct" onClick={() => nav('set')} title="Account & settings">
        <span className="sa-ava">{(username[0] || '?').toUpperCase()}</span>
        <span className="sa-who">
          <b>{username}</b>
          <span>{planLine}</span>
        </span>
        <IconChevronDown className="sa-cx" />
      </button>

      <nav className="side-nav" aria-label="Navigation">
        {PRIMARY.map(item)}

        <div className="side-cap">Scrapers</div>
        {SCRAPERS.map(item)}

        <div className="side-cap">Enrichment</div>
        {ENRICHMENT.map(item)}

        <div className="side-cap">Services</div>
        {SERVICES.map(item)}
      </nav>

      <div className="side-foot">
        {FOOTER.map(item)}
      </div>
    </aside>
  )
}
