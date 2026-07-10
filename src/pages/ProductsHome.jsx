import { PRODUCTS } from '../lib/products.js'
import { IconChevronRight } from '../lib/icons.jsx'

// Products home ("Tools") — the dashboard's landing view. Every Coldcast product as
// a card; "Use" opens that product's own tab (its in-app dashboard). Coming-soon
// products get a muted button that opens their teaser page instead. The Coldcast
// logo in the topbar returns here.
export default function ProductsHome({ nav }) {
  return (
    <div className="phome">
      <div className="phome-head">
        <h2>Tools</h2>
        <p>Every Coldcast product in one place — open one to start a job.</p>
      </div>

      <div className="phome-grid">
        {PRODUCTS.map((p) => {
          const Icon = p.icon
          return (
            <div className="pcard" data-p={p.id} key={p.id}>
              <div className="pcard-top">
                <div className="pcard-ic"><Icon /></div>
                {p.soon && <span className="pcard-soon">Soon</span>}
              </div>
              <h3>{p.label}</h3>
              <p className="pcard-body">{p.body || ''}</p>
              <button
                className={p.soon ? 'btn btn-g' : 'btn btn-p'}
                aria-label={p.soon ? `${p.label} — coming soon` : `Open ${p.label}`}
                onClick={() => nav(p.id)}
                title={p.soon ? `${p.label} — coming soon` : `Open ${p.label}`}
              >
                {p.soon ? 'Coming soon' : <>Use <IconChevronRight /></>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
