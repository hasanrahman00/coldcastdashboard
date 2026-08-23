import { PRODUCTS } from '../lib/products.js'
import { SERVICES } from '../lib/services.js'
import { IconLogo } from '../lib/icons.jsx'

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
        <span className="snav-ic snav-emoji">{p.image ? <img className="snav-img" src={p.image} alt="" /> : (p.emoji || <Icon />)}</span>
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
          <span className="snav-ic snav-emoji"><IconLogo /></span>
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
              <span className="snav-ic snav-emoji">{s.emoji || <Icon />}</span>
              <span className="snav-label">{s.label}</span>
              {s.deal && s.badge && <span className="snav-deal">{s.badge}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
