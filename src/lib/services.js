import { IconWhatsApp, IconUsers, IconAtSign, IconZap, IconFileLines } from './icons.jsx'

// The "Services" area — done-for-you offers, feedback, and free resources. Shared by the
// sidebar nav and the Tools-home "Services" section. `deal:true` marks the promo (the
// only one that shows a badge in the sidebar). Each id maps to a route in Dashboard.jsx.
export const SERVICES = [
  {
    id: 'sndeal',
    label: 'Sales Nav 75% OFF',
    icon: IconWhatsApp,
    emoji: '💸',
    badge: '75% OFF',
    deal: true,
    short: 'A full Sales Navigator subscription on your own account — 75% off list price.',
  },
  {
    id: 'prospectteam',
    label: 'Hire Prospect Team',
    icon: IconUsers,
    emoji: '🧑‍💼',
    badge: 'Done for you',
    short: 'Hand us your ICP — we build and deliver enriched, verified lead lists.',
  },
  {
    id: 'coldinfra',
    label: 'Cold Infrastructure',
    icon: IconAtSign,
    emoji: '📧',
    badge: 'Done for you',
    short: 'Domains, mailboxes & warmup, wired straight into your cold outreach platform.',
  },
  {
    id: 'requestfeature',
    label: 'Request Feature',
    icon: IconZap,
    emoji: '⚡',
    badge: 'Free',
    short: 'Report a bug, request a feature, or suggest a new scraper.',
  },
  {
    id: 'playbook',
    label: 'Free Playbook',
    icon: IconFileLines,
    emoji: '📘',
    badge: 'Free',
    short: 'Battle-tested GTM playbooks — download them free, no strings attached.',
  },
]
