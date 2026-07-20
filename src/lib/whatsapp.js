// Business WhatsApp number — used by the Sales Nav deal page, the Services forms, and
// the top-nav "Demo" button. VITE_DEAL_WHATSAPP overrides; the default keeps every
// WhatsApp CTA working out of the box. wa.me wants digits only, international format.
export const BUSINESS_WHATSAPP = String(
  import.meta.env.VITE_DEAL_WHATSAPP || '+880 1885-781259',
).replace(/\D/g, '')

// Build a wa.me link, optionally pre-filled with a message.
export const waLink = (text) =>
  `https://wa.me/${BUSINESS_WHATSAPP}${text ? '?text=' + encodeURIComponent(text) : ''}`
