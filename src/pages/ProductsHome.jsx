import { getProduct } from '../lib/products.js'

// Products home ("Tools") — the dashboard's landing view, grouped into sections like an
// enterprise console. Each card is a whole-card button (soft-tinted with the product
// accent + a status badge); it opens that product's tab, or its teaser page if soon.
const SECTIONS = [
  { title: 'Lead & company scraping', ids: ['salesnav', 'apollo', 'company', 'zoominfo'] },
  { title: 'Enrichment & verification', ids: ['linkedin', 'waterfall', 'verify', 'domain'] },
]

export default function ProductsHome({ nav }) {
  return (
    <div className="phome">
      <div className="phome-head">
        <h2>Tools</h2>
        <p>Every Coldcast product in one place — open one to start a job.</p>
      </div>

      {SECTIONS.map((sec) => (
        <section className="phome-sec" key={sec.title}>
          <h3 className="phome-sec-title">{sec.title}</h3>
          <div className="phome-grid">
            {sec.ids.map((id) => {
              const p = getProduct(id)
              if (!p) return null
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  className="pcard"
                  data-p={p.id}
                  onClick={() => nav(p.id)}
                  aria-label={p.soon ? `${p.label} — coming soon` : `Open ${p.label}`}
                >
                  <div className="pcard-top">
                    <span className="pcard-ic">
                      <Icon />
                    </span>
                    <span className={'pcard-badge ' + (p.soon ? 'soon' : 'live')}>{p.soon ? 'Soon' : 'Active'}</span>
                  </div>
                  <h4 className="pcard-name">{p.label}</h4>
                  <p className="pcard-desc">{p.short || p.body || ''}</p>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
