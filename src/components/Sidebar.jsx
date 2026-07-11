import { PRODUCTS } from '../lib/products.js'
import { IconLogo } from '../lib/icons.jsx'

// Left sidebar — the brand plus the FULL product list, always visible (no scrolling
// row that hides tools). Dashboard first, then the live products, a divider, and the
// coming-soon products grouped under a caption (dimmed but still navigable). Active row
// picks up the product accent (--pc) as a soft tint + a left accent bar.
export default function Sidebar({ route, nav }) {
  const live = PRODUCTS.filter((p) => !p.soon)
  const soon = PRODUCTS.filter((p) => p.soon)

  const item = (p) => {
    const on = route === p.id
    const label = p.navLabel || p.label
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
        <span className="snav-ic" aria-hidden="true">{p.emoji}</span>
        <span className="snav-label">{label}</span>
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
          <span className="snav-ic" aria-hidden="true">🏠</span>
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
      </nav>
    </aside>
  )
}
