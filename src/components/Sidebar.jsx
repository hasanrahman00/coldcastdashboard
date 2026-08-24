import { PRODUCTS } from '../lib/products.js'
import { SERVICES } from '../lib/services.js'
import { useApp } from '../store/AppStore.jsx'
import { IconLogo, IconChevronDown, IconPuzzle, IconGear, IconKeyOutline } from '../lib/icons.jsx'

// Which live products are "scrapers" vs "enrichment" — drives the two grouped nav sections
// (the rest of the live list is enrichment). sndeal is shown under Services, not here.
const SCRAPE_IDS = new Set(['salesnav', 'company', 'apollo', 'zoominfo', 'lisearch', 'post'])

// Left sidebar — dark, SECTIONED rail. Brand + account switcher up top, grouped nav
// (Scrapers / Enrichment / Coming soon / Services) in a scroll area, and a pinned utility
// footer (Extension / API key / Settings). Active row picks up a subtle pill + indigo bar.
export default function Sidebar({ route, nav }) {
  const { me } = useApp()
  const username = me?.user?.username || 'Account'
  const secondsLeft = me?.secondsLeft ?? 0
  const daysLeft = secondsLeft > 0 ? Math.ceil(secondsLeft / 86400) : 0
  const planLine = daysLeft > 0
    ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
    : (me?.user?.expired ? 'Expired' : 'Active')

  const live = PRODUCTS.filter((p) => !p.soon && p.id !== 'sndeal')
  const scrapers = live.filter((p) => SCRAPE_IDS.has(p.id))
  const enrichers = live.filter((p) => !SCRAPE_IDS.has(p.id))
  const soon = PRODUCTS.filter((p) => p.soon)

  const item = (p) => {
    const on = route === p.id
    const label = p.navLabel || p.label
    const Icon = p.icon
    return (
      <button
        key={p.id}
        className={'snav-item' + (on ? ' on' : '') + (p.soon ? ' soon' : '')}
        data-p={p.id}
        aria-current={on ? 'page' : undefined}
        aria-label={p.soon ? `${label} — coming soon` : label}
        title={label}
        onClick={() => nav(p.id)}
      >
        <span className="snav-ic snav-emoji">{p.image ? <img className="snav-img" src={p.image} alt="" /> : (p.emoji || <Icon />)}</span>
        <span className="snav-label">{label}</span>
        {p.badge && !p.soon && <span className="snav-deal">{p.badge}</span>}
        {p.soon && <span className="snav-soon">Soon</span>}
      </button>
    )
  }

  const footItem = (id, label, Icon) => (
    <button
      className={'snav-item' + (route === id ? ' on' : '')}
      aria-current={route === id ? 'page' : undefined}
      aria-label={label}
      title={label}
      onClick={() => nav(id)}
    >
      <span className="snav-ic"><Icon /></span>
      <span className="snav-label">{label}</span>
    </button>
  )

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

      <nav className="side-nav" aria-label="Products">
        <button
          className={'snav-item' + (route === 'home' ? ' on' : '')}
          data-p="home"
          aria-current={route === 'home' ? 'page' : undefined}
          aria-label="Dashboard"
          title="Dashboard"
          onClick={() => nav('home')}
        >
          <span className="snav-ic snav-emoji"><IconLogo /></span>
          <span className="snav-label">Dashboard</span>
        </button>

        <div className="side-cap">Scrapers</div>
        {scrapers.map(item)}

        <div className="side-cap">Enrichment</div>
        {enrichers.map(item)}

        {soon.length > 0 && (
          <>
            <div className="side-cap">Coming soon</div>
            {soon.map(item)}
          </>
        )}

        <div className="side-cap side-cap-svc">Services</div>
        {SERVICES.map((s) => {
          const on = route === s.id
          const Icon = s.icon
          return (
            <button
              key={s.id}
              className={'snav-item snav-svc' + (on ? ' on' : '')}
              aria-current={on ? 'page' : undefined}
              aria-label={s.label}
              title={s.label}
              onClick={() => nav(s.id)}
            >
              <span className="snav-ic snav-emoji">{s.emoji || <Icon />}</span>
              <span className="snav-label">{s.label}</span>
              {s.deal && s.badge && <span className="snav-deal">{s.badge}</span>}
            </button>
          )
        })}
      </nav>

      <div className="side-foot">
        {footItem('ext', 'Extension', IconPuzzle)}
        {footItem('api', 'API key', IconKeyOutline)}
        {footItem('set', 'Settings', IconGear)}
      </div>
    </aside>
  )
}
