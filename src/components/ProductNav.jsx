import { PRODUCTS } from '../lib/products.js'

// Product tabs — centered and wrapping (the ported CSS colours each tab by its
// data-p attribute and draws the active underline). Live products fill the first
// row; the coming-soon ones wrap onto a centered SECOND row (the .pnav-break forces
// the wrap), so every product is visible instead of scrolling off the right edge.
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
      {live.map(renderTab)}
      {soon.length > 0 && <div className="pnav-break" aria-hidden="true" />}
      {soon.map(renderTab)}
    </div>
  )
}
