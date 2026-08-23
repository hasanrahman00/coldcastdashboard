import {
  IconGlobe,
  IconLayers,
  IconFeather,
  IconSearchPlus,
  IconMailCheck,
  IconAtSign,
  IconLink,
  IconUsers,
  IconWhatsApp,
  IconZap,
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
    label: 'LinkedIn Sales Navigator Scraper',   // big page header
    navLabel: 'LinkedIn Sales Navigator',        // shorter sidebar tab
    soon: false,
    icon: IconGlobe,
    emoji: '🧭',
    image: '/salesnav-icon.webp',   // Sales Navigator app icon (public/); falls back to emoji
    title: 'LinkedIn Sales Navigator Scraper',
    short: 'Enriched lead lists from your LinkedIn Sales Navigator searches.',
    body: 'Export clean, enriched lead lists from your LinkedIn Sales Navigator searches — names, titles, verified emails, and company firmographics — in one click.',
  },
  {
    id: 'apollo',
    label: 'Scrape Apollo Leads',   // big page header + tools card
    navLabel: 'Scrape Apollo',       // sidebar tab
    soon: false,
    icon: IconFeather,
    emoji: '🚀',
    image: '/apollo-icon.png',   // Apollo.io logo (public/); falls back to emoji
    title: 'Scrape Apollo Leads',
    short: 'Targeted contact & company lists from your Apollo searches.',
    body: 'Export targeted contact and company lists straight from your Apollo searches — names, titles, verified emails, and firmographics — with the same one-click flow as the Sales Nav scraper.',
  },
  {
    id: 'company',
    label: 'Sales Navigator Account Scraper',   // big page header + tools card
    navLabel: 'Sales Navigator Account',         // sidebar tab
    soon: false,
    icon: IconUsers,
    emoji: '🏢',
    image: '/salesnav-icon.webp',   // same Sales Navigator app icon as the salesnav product
    title: 'Sales Navigator Account Scraper',
    short: 'Company & account lists from your Sales Navigator searches.',
    body: 'Export company & account lists straight from your LinkedIn Sales Navigator account searches — company names, domains, size, industry, and firmographics — with the same one-click flow as the lead scrapers.',
  },
  {
    id: 'post',
    label: 'LinkedIn Post React & Engage Scraper',   // big page header + tools card
    navLabel: 'LinkedIn React & Engage',              // shorter sidebar tab (avoids truncation)
    soon: false,
    icon: IconZap,
    emoji: '👥',
    image: '/linkedin-icon-v2.jpg',   // LinkedIn app icon (public/); falls back to emoji
    title: 'LinkedIn Post React & Engage Scraper',
    short: 'Everyone who reacted, commented, or reposted a LinkedIn post.',
    body: 'Turn any LinkedIn post into a lead list — every profile that reacted, commented, or reposted it — exported straight from your own connected browser. Paste the post URL, run it, download the CSV.',
  },
  {
    id: 'lisearch',
    label: 'LinkedIn Search & Service URL Scraper',   // big page header + tools card
    navLabel: 'LinkedIn Search',                   // sidebar tab (short — full name truncated)
    soon: false,
    icon: IconSearchPlus,
    emoji: '🕵️',
    image: '/linkedin-icon-v2.jpg',   // LinkedIn app icon (same as the post product)
    title: 'LinkedIn Search & Service URL Scraper',
    short: 'People & Services search → clean CSV, optionally enriched.',
    body: 'Export any LinkedIn People or Services search into a clean CSV — names, headlines, locations, and profile URLs — scraped in your own connected browser, with optional email + company enrichment (Lusha / ContactOut / SalesQL).',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn URL Enrichment',   // big page header + tools card
    navLabel: 'LinkedIn URL Enrich',      // sidebar tab (unchanged)
    soon: false,
    icon: IconLink,
    emoji: '🔗',
    image: '/linkedin-icon-v2.jpg',   // LinkedIn app icon (same as the post product)
    title: 'LinkedIn URL Enrichment',
    short: 'Turn LinkedIn profile URLs into names, emails & firmographics.',
    body: 'Upload a list of LinkedIn profile URLs and get back names, titles, verified business emails, phones, and company firmographics — enriched in your own connected browser across Lusha, ContactOut, and SalesQL, then merged into one clean CSV.',
  },
  {
    id: 'waterfall',
    label: 'Waterfall Email Enrich',   // big page header + tools card
    navLabel: 'Email Enrichment',        // sidebar tab
    soon: false,
    icon: IconLayers,
    emoji: '🌊',
    image: '/email-icon.png',   // @-envelope email icon (public/); falls back to emoji
    title: 'Waterfall Email Enrich',
    short: 'Chain providers to maximize verified-email coverage.',
    body: 'Chain your providers in a waterfall to maximize verified-email coverage. Each lead falls through to the next source until a valid, deliverable address is found — then runs through the built-in verifier.',
  },
  {
    id: 'sndeal',
    label: 'Sales Nav 75% OFF',
    navLabel: 'Sales Nav 75% OFF',
    badge: '75% OFF',
    deal: true,
    soon: false,
    icon: IconWhatsApp,
    emoji: '💸',
    title: 'LinkedIn Sales Navigator — 75% OFF',
    short: 'A full Sales Navigator subscription on your own account — 75% off.',
    body: 'Get a full LinkedIn Sales Navigator subscription activated on your own account at 75% off list price. Drop your details and connect with us on WhatsApp to claim the deal.',
  },
  {
    id: 'zoominfo',
    label: 'Scrape ZoomInfo Leads',   // big page header + tools card
    navLabel: 'Scrape ZoomInfo',       // sidebar tab
    soon: false,
    icon: IconSearchPlus,
    emoji: '🔎',
    image: '/zoominfo-icon-v2.png',   // ZoomInfo logo (public/); falls back to emoji
    title: 'Scrape ZoomInfo Leads',
    short: 'Pull contacts & accounts from ZoomInfo into clean CSVs.',
    body: 'Pull contacts and accounts from ZoomInfo into clean, enriched CSVs — direct dials, work emails, and company data — without manual exports or seat limits.',
  },
  {
    id: 'verify',
    label: 'Remove Catch-all & Bounced Emails',   // big page header + tools card
    navLabel: 'Catch Email Verify',                 // sidebar tab
    soon: false,
    icon: IconMailCheck,
    emoji: '✅',
    image: '/verify-icon.jpg',   // email-verify icon (public/); falls back to emoji
    title: 'Remove Catch-all & Bounced Emails',
    short: 'Bulk-validate emails — syntax, MX, SMTP, catch-all & risk.',
    body: 'Validate any email list in bulk — syntax, MX, SMTP, catch-all, and risk scoring — so you only send to deliverable addresses and protect your sender reputation. This is the engine that powers the waterfall enricher.',
  },
  {
    id: 'domain',
    label: 'Enrich Website With AI',   // big page header + tools card
    navLabel: 'AI SDR',                  // sidebar tab
    soon: false,
    icon: IconAtSign,
    emoji: '🌐',
    image: '/aisdr-icon.png',   // AI SDR icon (public/); falls back to emoji
    title: 'Enrich Website With AI',
    short: 'Turn company domains into full firmographics.',
    body: 'Turn a list of company domains into full firmographics — company name, industry, size, location, socials, and key contacts — in one upload. The same enrichment engine behind the scraper, pointed straight at domains.',
  },
]

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id)
