import { useState } from 'react'
import { PRODUCTS, getProduct } from '../lib/products.js'
import { SERVICES } from '../lib/services.js'
import { IconSearch } from '../lib/icons.jsx'

// Products home ("Tools") — the dashboard's landing view. Enterprise console layout:
// a search bar, a featured hero for the flagship product, then the rest grouped into
// sections. Each card is a whole-card button (soft-tinted with the product accent + a
// status badge); it opens that product's tab, or its teaser page if soon.
const SECTIONS = [
  { title: 'Lead & company scraping', ids: ['salesnav', 'apollo', 'company', 'zoominfo'] },
  { title: 'Enrichment & verification', ids: ['linkedin', 'waterfall', 'verify', 'domain'] },
]

// The flagship product shown as the big hero banner (and excluded from its section grid
// so it never appears twice).
const FEATURED = 'salesnav'

function Card({ p, nav }) {
  const Icon = p.icon
  return (
    <button
      className="pcard"
      data-p={p.id}
      onClick={() => nav(p.id)}
      aria-label={p.soon ? `${p.label} — coming soon` : `Open ${p.label}`}
    >
      <div className="pcard-top">
        <span className="pcard-ic">
          <Icon />
        </span>
        <span className={'pcard-badge ' + (p.soon ? 'soon' : p.deal ? 'deal' : 'live')}>
          {p.soon ? 'Soon' : p.badge || 'Active'}
        </span>
      </div>
      <h4 className="pcard-name">{p.label}</h4>
      <p className="pcard-desc">{p.short || p.body || ''}</p>
    </button>
  )
}

export default function ProductsHome({ nav }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const searching = query.length > 0
  const match = (p) => (p.label + ' ' + (p.short || '') + ' ' + (p.body || '')).toLowerCase().includes(query)
  // Search products + services (sndeal lives in SERVICES now, so drop the PRODUCTS copy)
  const searchable = [...PRODUCTS.filter((p) => p.id !== 'sndeal'), ...SERVICES]
  const results = searching ? searchable.filter(match) : []

  const featured = getProduct(FEATURED)
  const FeatIcon = featured?.icon

  return (
    <div className="phome">
      <div className="phome-head">
        <h2>Tools</h2>
        <p>Every Coldcast product in one place — open one to start a job.</p>
      </div>

      <div className="phome-search">
        <IconSearch />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools…"
          aria-label="Search tools"
        />
        {q && (
          <button className="phome-search-x" onClick={() => setQ('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {searching ? (
        results.length ? (
          <div className="phome-grid">
            {results.map((p) => (
              <Card key={p.id} p={p} nav={nav} />
            ))}
          </div>
        ) : (
          <p className="phome-empty">No tools match “{q.trim()}”.</p>
        )
      ) : (
        <>
          {featured && (
            <button
              className="pcard-feat"
              data-p={featured.id}
              onClick={() => nav(featured.id)}
              aria-label={`Open ${featured.label}`}
            >
              <span className="pcard-feat-ic">{FeatIcon ? <FeatIcon /> : featured.emoji}</span>
              <div className="pcard-feat-body">
                <span className="pcard-badge live">Active · Flagship</span>
                <h3 className="pcard-feat-name">{featured.label}</h3>
                <p className="pcard-feat-desc">{featured.body}</p>
                <span className="pcard-feat-cta">Open tool →</span>
              </div>
            </button>
          )}

          {SECTIONS.map((sec) => {
            const items = sec.ids
              .map(getProduct)
              .filter(Boolean)
              .filter((p) => p.id !== FEATURED)
            if (!items.length) return null
            return (
              <section className="phome-sec" key={sec.title}>
                <h3 className="phome-sec-title">
                  {sec.title}
                  <span className="phome-sec-count">{items.length}</span>
                </h3>
                <div className="phome-grid">
                  {items.map((p) => (
                    <Card key={p.id} p={p} nav={nav} />
                  ))}
                </div>
              </section>
            )
          })}

          <section className="phome-sec">
            <h3 className="phome-sec-title">
              Services
              <span className="phome-sec-count">{SERVICES.length}</span>
            </h3>
            <div className="phome-grid">
              {SERVICES.map((s) => (
                <Card key={s.id} p={s} nav={nav} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
