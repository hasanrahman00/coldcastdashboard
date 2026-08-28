// Nav + tool line icons — ported VERBATIM from the approved mockup. Shared by the Sidebar,
// the home tool cards, and the recent-jobs strip so every surface uses the identical icon.
export const NAV_ICONS = {
  dashboard: <path d="M4 5h7v6H4zM13 5h7v4h-7zM13 12h7v7h-7zM4 14h7v5H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  workbench: <><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 9h18M8 4v16" stroke="currentColor" strokeWidth="1.8" /></>,
  leads: <><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  salesnav: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></>,
  company: <><rect x="4" y="3" width="10" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M14 8h6v13h-6M7 7h4M7 11h4M7 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  apollo: <><path d="M12 2s5 2 5 9c0 3-2 6-5 9-3-3-5-6-5-9 0-7 5-9 5-9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" /></>,
  apollofree: <><path d="M12 2s5 2 5 9c0 3-2 6-5 9-3-3-5-6-5-9 0-7 5-9 5-9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" /></>,
  zoominfo: <><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3.5-3.5M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  lisearch: <><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" /><path d="M3.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M17 11l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></>,
  post: <path d="M12 20s-7-4.3-7-9.3A3.7 3.7 0 0112 8a3.7 3.7 0 017 2.7C19 15.7 12 20 12 20z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  linkedin: <path d="M9 15l6-6M8 12l-2 2a3.5 3.5 0 005 5l2-2M16 12l2-2a3.5 3.5 0 00-5-5l-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  waterfall: <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3zM4 12l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  verify: <><path d="M4 6l4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 8v9a3 3 0 01-3 3H7a3 3 0 01-3-3v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  domain: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z" stroke="currentColor" strokeWidth="1.7" /></>,
  sndeal: <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  doneforyou: <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  ext: <path d="M10 4H6a2 2 0 00-2 2v4m6-6h4m-4 0v3.5a1.5 1.5 0 003 0V4m4 6V6a2 2 0 00-2-2m2 6h.5a1.5 1.5 0 010 3H20m0-3v4m0 0v4a2 2 0 01-2 2h-4m0 0v-3.5a1.5 1.5 0 00-3 0V20m0 0H6a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  billing: <><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" /></>,
  settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L16 3H8l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 003 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2L8 21h8l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></>,
}

export const NavIcon = ({ k, className }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>{NAV_ICONS[k] || null}</svg>
)
