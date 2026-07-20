import { PRODUCTS } from '../lib/products.js'
import { IconLogo, IconGrid, IconUsers, IconAtSign, IconZap, IconWhatsApp } from '../lib/icons.jsx'

// A separate nav area, below the products: the Sales Nav deal + done-for-you services +
// feedback. Rendered with a mint accent so it reads as distinct from the (lime) product
// tabs. `sndeal` also appears in the product tabs — it just routes to the same page.
const SERVICES = [
  { id: 'sndeal', label: 'Sales Nav 75% OFF', icon: IconWhatsApp, badge: '75% OFF' },
  { id: 'prospectteam', label: 'Hire Prospect Team', icon: IconUsers },
  { id: 'coldinfra', label: 'Cold Infrastructure', icon: IconAtSign },
  { id: 'requestfeature', label: 'Request Feature', icon: IconZap },
]

// Left sidebar — the brand plus the FULL product list, always visible (no scrolling
// row that hides tools). Dashboard first, then the live products, a divider, and the
// coming-soon products grouped under a caption (dimmed but still navigable). Active row
// picks up the product accent (--pc) as a soft tint + a left accent bar.
export default function Sidebar({ route, nav }) {
  // sndeal (Sales Nav 75% OFF) is shown under Services below, so keep it out of the
  // product tabs to avoid a duplicate nav entry.
  const live = PRODUCTS.filter((p) => !p.soon && p.id !== 'sndeal')
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
        <span className="snav-ic"><Icon /></span>
        <span className="snav-label">{label}</span>
        {p.badge && !p.soon && <span className="snav-deal">{p.badge}</span>}
        {p.soon && <span className="snav-soon">Soon</span>}
      </button>
    )
  }

  return (
    <aside className="side">
      <div className="side-brand" onClick={() => nav('home')} title="Home">
        <div className="side-logo"><IconLogo /></div>
        <h1>Coldcast</h1>
      </div>

      <nav className="side-nav" aria-label="Products">
        <button
          className={'snav-item' + (route === 'home' ? ' on' : '')}
          data-p="home"
          aria-current={route === 'home' ? 'page' : undefined}
          aria-label="Dashboard"
          title="Dashboard"
          onClick={() => nav('home')}
        >
          <span className="snav-ic"><IconGrid /></span>
          <span className="snav-label">Dashboard</span>
        </button>

        {live.map(item)}

        {soon.length > 0 && (
          <>
            <div className="side-sep" />
            <div className="side-cap">Coming soon</div>
            {soon.map(item)}
          </>
        )}

        {/* Separate nav area — done-for-you services + feature requests */}
        <div className="side-sep" />
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
              <span className="snav-ic"><Icon /></span>
              <span className="snav-label">{s.label}</span>
              {s.badge && <span className="snav-deal">{s.badge}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
