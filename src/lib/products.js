import {
  IconSearch,
  IconFilter,
  IconLayers,
  IconDatabase,
  IconMailCheck,
  IconGlobe,
} from './icons.jsx'

// ─────────────────────────────────────────────────────────────────────────────
//  The product registry — the ONE source of truth for the nav + routing.
//
//  Adding a new app = add an entry here (+ a page component wired in App's
//  router). The nav tabs, accent colours, "Soon" badges, and the active-tab
//  underline all derive from this array — no four-places-to-edit problem.
//
//  `accent` is a raw hex (used inline for per-product colour, since Tailwind
//  can't generate class names from runtime variables).
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCTS = [
  { id: 'salesnav',  label: 'Sales Nav',         short: 'Sales Navigator scraper',   accent: '#4f7cf5', status: 'live', icon: IconSearch },
  { id: 'waterfall', label: 'Waterfall',         short: 'Waterfall email enricher',  accent: '#0891b2', status: 'soon', icon: IconFilter },
  { id: 'apollo',    label: 'Apollo',            short: 'Apollo scraper',            accent: '#ea580c', status: 'soon', icon: IconLayers },
  { id: 'zoominfo',  label: 'ZoomInfo',          short: 'ZoomInfo scraper',          accent: '#7c3aed', status: 'soon', icon: IconDatabase },
  { id: 'verify',    label: 'Email Verify',      short: 'Email verification',        accent: '#059669', status: 'soon', icon: IconMailCheck },
  { id: 'domain',    label: 'Domain Enrichment', short: 'Company → domain enrich',   accent: '#db2777', status: 'soon', icon: IconGlobe },
]

export const PRODUCT_IDS = PRODUCTS.map((p) => p.id)
export const getProduct = (id) => PRODUCTS.find((p) => p.id === id)
