import { useState } from 'react'
import { PRODUCTS, getProduct } from '../lib/products.js'
import { SERVICES } from '../lib/services.js'
import { IconSearch } from '../lib/icons.jsx'

// Products home ("Tools") — landing view. Mindcase-style layout: a horizontal
// header (title + live search) over a scrollable category-tab row, then a single
// card grid filtered by the active tab (or by the search query).
const GROUPS = [
  { key: 'scraping', title: 'Scraping', ids: ['salesnav', 'apollo', 'company', 'zoominfo'] },
  { key: 'enrichment', title: 'Enrichment', ids: ['linkedin', 'waterfall', 'verify', 'domain'] },
]

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
  const [cat, setCat] = useState('all')
  const query = q.trim().toLowerCase()
  const searching = query.length > 0
  const match = (p) => (p.label + ' ' + (p.short || '') + ' ' + (p.body || '')).toLowerCase().includes(query)

  // Category → items. "All" spans every product + service; sndeal lives in
  // SERVICES now, so drop its PRODUCTS copy.
  const groups = GROUPS.map((g) => ({ ...g, items: g.ids.map(getProduct).filter(Boolean) }))
  const services = { key: 'services', title: 'Services', items: SERVICES }
  const allItems = [...PRODUCTS.filter((p) => p.id !== 'sndeal'), ...SERVICES]
  const cats = [{ key: 'all', title: 'All', items: allItems }, ...groups, services]

  const active = cats.find((c) => c.key === cat) || cats[0]
  const shown = searching ? allItems.filter(match) : active.items

  return (
    <div className="phome">
      <div className="phome-top">
        <div className="phome-titlewrap">
          <h2>Tools</h2>
          <p>{allItems.length} tools · every Coldcast product in one place.</p>
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
      </div>

      {!searching && (
        <div className="phome-tabs" role="tablist" aria-label="Tool categories">
          {cats.map((c) => (
            <button
              key={c.key}
              role="tab"
              aria-selected={cat === c.key}
              className={'phome-tab' + (cat === c.key ? ' on' : '')}
              onClick={() => setCat(c.key)}
            >
              {c.title}
              <span className="phome-tab-n">{c.items.length}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length ? (
        <div className="phome-grid">
          {shown.map((p) => (
            <Card key={p.id} p={p} nav={nav} />
          ))}
        </div>
      ) : (
        <p className="phome-empty">
          {searching ? `No tools match “${q.trim()}”.` : 'Nothing in this category yet.'}
        </p>
      )}
    </div>
  )
}
