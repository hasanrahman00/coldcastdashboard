import { useApp } from '../store/AppStore.jsx'
import { IconLogo, IconChevronDown } from '../lib/icons.jsx'

// ── Nav icons — ported VERBATIM from the approved mockup (line icons, currentColor). ──
const ICONS = {
  dashboard: <path d="M4 5h7v6H4zM13 5h7v4h-7zM13 12h7v7h-7zM4 14h7v5H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  workbench: <><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 9h18M8 4v16" stroke="currentColor" strokeWidth="1.8" /></>,
  leads: <><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  salesnav: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></>,
  company: <><rect x="4" y="3" width="10" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M14 8h6v13h-6M7 7h4M7 11h4M7 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  apollo: <><path d="M12 2s5 2 5 9c0 3-2 6-5 9-3-3-5-6-5-9 0-7 5-9 5-9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" /></>,
  zoominfo: <><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3.5-3.5M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  lisearch: <><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" /><path d="M3.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M17 11l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></>,
  post: <path d="M12 20s-7-4.3-7-9.3A3.7 3.7 0 0112 8a3.7 3.7 0 017 2.7C19 15.7 12 20 12 20z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  linkedin: <path d="M9 15l6-6M8 12l-2 2a3.5 3.5 0 005 5l2-2M16 12l2-2a3.5 3.5 0 00-5-5l-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  waterfall: <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3zM4 12l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  verify: <><path d="M4 6l4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 8v9a3 3 0 01-3 3H7a3 3 0 01-3-3v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  domain: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z" stroke="currentColor" strokeWidth="1.7" /></>,
  sndeal: <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  prospectteam: <><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M15 11a3 3 0 100-6M3.5 19c.6-3 3-4.5 5.5-4.5s4.9 1.5 5.5 4.5M17 14.5c2.2.2 3.9 1.6 4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></>,
  coldinfra: <><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></>,
  requestfeature: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  playbook: <path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zM8 3v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  ext: <path d="M10 4H6a2 2 0 00-2 2v4m6-6h4m-4 0v3.5a1.5 1.5 0 003 0V4m4 6V6a2 2 0 00-2-2m2 6h.5a1.5 1.5 0 010 3H20m0-3v4m0 0v4a2 2 0 01-2 2h-4m0 0v-3.5a1.5 1.5 0 00-3 0V20m0 0H6a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  billing: <><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" /></>,
  settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L16 3H8l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 003 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2L8 21h8l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></>,
}
const Ic = ({ k }) => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{ICONS[k]}</svg>

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
  { key: 'apollo', route: 'apollo', label: 'Apollo' },
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
  { key: 'sndeal', route: 'sndeal', label: 'Sales Nav Deal', tag: '75% OFF', deal: true },
  { key: 'prospectteam', route: 'prospectteam', label: 'Hire Prospect Team' },
  { key: 'coldinfra', route: 'coldinfra', label: 'Cold Infrastructure' },
  { key: 'requestfeature', route: 'requestfeature', label: 'Request Feature' },
  { key: 'playbook', route: 'playbook', label: 'Free Playbook' },
]
const FOOTER = [
  { key: 'ext', route: 'ext', label: 'Extension' },
  { key: 'billing', route: 'set', label: 'Billing', placeholder: true },
  { key: 'settings', route: 'set', label: 'Settings' },
]

export default function Sidebar({ route, nav }) {
  const { me, jobs, companyJobs, apolloJobs, zoominfoJobs, lisearchJobs, postJobs, enricherJobs, domainJobs } = useApp()
  const username = me?.user?.username || 'Account'
  const secondsLeft = me?.secondsLeft ?? 0
  const daysLeft = secondsLeft > 0 ? Math.ceil(secondsLeft / 86400) : 0
  const planLine = daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : (me?.user?.expired ? 'Expired' : 'Active')

  const counts = {
    salesnav: (jobs || []).length, company: (companyJobs || []).length, apollo: (apolloJobs || []).length,
    zoominfo: (zoominfoJobs || []).length, lisearch: (lisearchJobs || []).length, post: (postJobs || []).length,
    linkedin: (enricherJobs || []).length, domain: (domainJobs || []).length,
  }

  const item = (it) => {
    const on = route === it.route && !it.placeholder
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
        <span className="snav-ic"><Ic k={it.key} /></span>
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
