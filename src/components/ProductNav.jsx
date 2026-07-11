import { PRODUCTS } from '../lib/products.js'
import { IconGrid } from '../lib/icons.jsx'

// Product tabs — a "Dashboard" (home) entry first so you can jump back to the Tools
// grid from anywhere, then the live products, a hairline divider, and the coming-soon
// products grouped at the end (dimmed but still navigable). Left-aligned single row
// that scrolls horizontally on overflow. Shown on every route (incl. home, where
// "Dashboard" is the active tab).
export default function ProductNav({ route, nav }) {
  const live = PRODUCTS.filter((p) => !p.soon)
  const soon = PRODUCTS.filter((p) => p.soon)

  const renderTab = (p) => {
    const on = route === p.id
    const Icon = p.icon
    return (
      <button
        key={p.id}
        className={'ptab' + (on ? ' on' : '') + (p.soon ? ' soon' : '')}
        data-p={p.id}
        role="tab"
        aria-selected={on ? 'true' : 'false'}
        aria-disabled={p.soon ? 'true' : undefined}
        onClick={() => nav(p.id)}
      >
        <Icon />
        {p.label}
        {p.soon && <span className="soon-b">Soon</span>}
      </button>
    )
  }

  return (
    <div className="pnav" role="tablist" aria-label="Products">
      <button
        className={'ptab ptab-home' + (route === 'home' ? ' on' : '')}
        data-p="home"
        role="tab"
        aria-selected={route === 'home' ? 'true' : 'false'}
        onClick={() => nav('home')}
      >
        <IconGrid />
        Dashboard
      </button>
      {live.map(renderTab)}
      {soon.length > 0 && <span className="pnav-sep" aria-hidden="true" />}
      {soon.map(renderTab)}
    </div>
  )
}
