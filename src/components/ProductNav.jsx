import { PRODUCTS } from '../lib/products.js'

// Horizontal product tabs. The ported CSS colours each tab by its data-p
// attribute (.ptab[data-p="salesnav"] etc.) and draws the active underline.
export default function ProductNav({ route, nav }) {
  return (
    <div className="pnav" role="tablist" aria-label="Products">
      {PRODUCTS.map((p) => {
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
      })}
    </div>
  )
}
