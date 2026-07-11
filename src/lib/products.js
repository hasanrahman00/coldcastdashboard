import {
  IconGlobe,
  IconLayers,
  IconFeather,
  IconSearchPlus,
  IconMailCheck,
  IconAtSign,
  IconLink,
  IconUsers,
} from './icons.jsx'

// ─────────────────────────────────────────────────────────────────────────────
//  Product registry — single source of truth for the nav + routing + the
//  coming-soon copy. `id` doubles as the route and the CSS data-p key (the
//  ported stylesheet colours each tab via .ptab[data-p="<id>"]).
//
//  `icon`  — line icon used in the nav tabs + cards.
//  `emoji` — real emoji used in the big centered per-product page header.
//  `short` — ONE-LINE tagline shown on the Tools-home cards.
//  `body`  — longer description used on the coming-soon page.
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
    emoji: '🧭',
    title: 'Sales Nav Scraper',
    short: 'Enriched lead lists from your LinkedIn Sales Navigator searches.',
    body: 'Export clean, enriched lead lists from your LinkedIn Sales Navigator searches — names, titles, verified emails, and company firmographics — in one click.',
  },
  {
    id: 'waterfall',
    label: 'Waterfall Email Enricher',
    soon: false,
    icon: IconLayers,
    emoji: '🌊',
    title: 'Waterfall Email Enricher',
    short: 'Chain providers to maximize verified-email coverage.',
    body: 'Chain your providers in a waterfall to maximize verified-email coverage. Each lead falls through to the next source until a valid, deliverable address is found — then runs through the built-in verifier.',
  },
  {
    id: 'apollo',
    label: 'Apollo Scraper',
    soon: false,
    icon: IconFeather,
    emoji: '🚀',
    title: 'Apollo Scraper',
    short: 'Targeted contact & company lists from your Apollo searches.',
    body: 'Export targeted contact and company lists straight from your Apollo searches — names, titles, verified emails, and firmographics — with the same one-click flow as the Sales Nav scraper.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn URL Enricher',
    soon: false,
    icon: IconLink,
    emoji: '🔗',
    title: 'LinkedIn URL Enricher',
    short: 'Turn LinkedIn profile URLs into names, emails & firmographics.',
    body: 'Upload a list of LinkedIn profile URLs and get back names, titles, verified business emails, phones, and company firmographics — enriched in your own connected browser across Lusha, ContactOut, and SalesQL, then merged into one clean CSV.',
  },
  {
    id: 'company',
    label: 'Sales Nav Company Scraper',
    navLabel: 'Company Scraper',
    soon: false,
    icon: IconUsers,
    emoji: '🏢',
    title: 'Sales Nav Company Scraper',
    short: 'Company & account lists from your Sales Navigator searches.',
    body: 'Export company & account lists straight from your LinkedIn Sales Navigator account searches — company names, domains, size, industry, and firmographics — with the same one-click flow as the lead scrapers.',
  },
  {
    id: 'zoominfo',
    label: 'ZoomInfo Scraper',
    soon: true,
    icon: IconSearchPlus,
    emoji: '🔎',
    title: 'ZoomInfo Scraper',
    short: 'Pull contacts & accounts from ZoomInfo into clean CSVs.',
    body: 'Pull contacts and accounts from ZoomInfo into clean, enriched CSVs — direct dials, work emails, and company data — without manual exports or seat limits.',
  },
  {
    id: 'verify',
    label: 'Email Verify',
    soon: true,
    icon: IconMailCheck,
    emoji: '✅',
    title: 'Email Verify',
    short: 'Bulk-validate emails — syntax, MX, SMTP, catch-all & risk.',
    body: 'Validate any email list in bulk — syntax, MX, SMTP, catch-all, and risk scoring — so you only send to deliverable addresses and protect your sender reputation. This is the engine that powers the waterfall enricher.',
  },
  {
    id: 'domain',
    label: 'Domain Enrichment',
    soon: true,
    icon: IconAtSign,
    emoji: '🌐',
    title: 'Domain Enrichment',
    short: 'Turn company domains into full firmographics.',
    body: 'Turn a list of company domains into full firmographics — company name, industry, size, location, socials, and key contacts — in one upload. The same enrichment engine behind the scraper, pointed straight at domains.',
  },
]

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id)
