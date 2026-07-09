import {
  IconGlobe,
  IconLayers,
  IconFeather,
  IconSearchPlus,
  IconMailCheck,
  IconAtSign,
  IconLink,
} from './icons.jsx'

// ─────────────────────────────────────────────────────────────────────────────
//  Product registry — single source of truth for the nav + routing + the
//  coming-soon copy. `id` doubles as the route and the CSS data-p key (the
//  ported stylesheet colours each tab via .ptab[data-p="<id>"]).
//
//  Add a product → add an entry. While soon:true it renders the shared
//  ComingSoon page automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCTS = [
  {
    id: 'salesnav',
    label: 'Sales Nav Scraper',
    soon: false,
    icon: IconGlobe,
  },
  {
    id: 'waterfall',
    label: 'Waterfall Email Enricher',
    soon: false,
    icon: IconLayers,
    title: 'Waterfall Email Enricher',
    body: 'Chain your providers in a waterfall to maximize verified-email coverage. Each lead falls through to the next source until a valid, deliverable address is found — then runs through the built-in verifier.',
  },
  {
    id: 'apollo',
    label: 'Apollo Scraper',
    soon: false,
    icon: IconFeather,
    title: 'Apollo Scraper',
    body: 'Export targeted contact and company lists straight from your Apollo searches — names, titles, verified emails, and firmographics — with the same one-click flow as the Sales Nav scraper.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn URL Enricher',
    soon: false,
    icon: IconLink,
    title: 'LinkedIn URL Enricher',
    body: 'Upload a list of LinkedIn profile URLs and get back names, titles, verified business emails, phones, and company firmographics — enriched in your own connected browser across Lusha, ContactOut, and SalesQL, then merged into one clean CSV.',
  },
  {
    id: 'zoominfo',
    label: 'ZoomInfo Scraper',
    soon: true,
    icon: IconSearchPlus,
    title: 'ZoomInfo Scraper',
    body: 'Pull contacts and accounts from ZoomInfo into clean, enriched CSVs — direct dials, work emails, and company data — without manual exports or seat limits.',
  },
  {
    id: 'verify',
    label: 'Email Verify',
    soon: true,
    icon: IconMailCheck,
    title: 'Email Verify',
    body: 'Validate any email list in bulk — syntax, MX, SMTP, catch-all, and risk scoring — so you only send to deliverable addresses and protect your sender reputation. This is the engine that powers the waterfall enricher.',
  },
  {
    id: 'domain',
    label: 'Domain Enrichment',
    soon: true,
    icon: IconAtSign,
    title: 'Domain Enrichment',
    body: 'Turn a list of company domains into full firmographics — company name, industry, size, location, socials, and key contacts — in one upload. The same enrichment engine behind the scraper, pointed straight at domains.',
  },
]

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id)
