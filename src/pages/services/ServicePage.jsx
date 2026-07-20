import { IconWhatsApp } from '../../lib/icons.jsx'
import { useToast } from '../../store/ToastProvider.jsx'

// Shared shell for the "Services" nav area (Hire Prospect Team, Cold Infrastructure,
// Request Feature). Each is a lead-capture form — a lime→mint hero on the left, a dark
// form card on the right. On submit we open WhatsApp to our business number with the
// request pre-filled (same delivery as the Sales Nav deal page), so it works with no
// extra backend. Set VITE_DEAL_WHATSAPP to the destination number.
const BUSINESS_WHATSAPP = String(import.meta.env.VITE_DEAL_WHATSAPP || '').replace(/\D/g, '')

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())

export default function ServicePage({ hero, children, valid, buildMessage, submitLabel = 'Send on WhatsApp', fine }) {
  const toast = useToast()
  const configured = BUSINESS_WHATSAPP.length >= 7
  const Icon = hero.icon

  const submit = () => {
    if (!valid) return toast('Please fill in the required fields', 'err')
    if (!configured) return toast('WhatsApp isn’t configured yet — set VITE_DEAL_WHATSAPP', 'err')
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(buildMessage())}`, '_blank', 'noopener')
    toast('Opening WhatsApp with your request…', 'ok')
  }

  return (
    <div className="svc">
      <div className="svc-hero">
        <span className="svc-ic"><Icon /></span>
        {hero.badge && <span className="svc-badge">{hero.badge}</span>}
        <h3>{hero.title}</h3>
        <p>{hero.subtitle}</p>
        {hero.points && (
          <ul className="svc-points">
            {hero.points.map((pt) => <li key={pt}>{pt}</li>)}
          </ul>
        )}
      </div>

      <div className="svc-card">
        <h4>{hero.formTitle || 'Tell us what you need'}</h4>
        {children}
        <button
          className="btn svc-submit"
          onClick={submit}
          disabled={!valid}
          title={configured ? '' : 'WhatsApp number not configured yet (VITE_DEAL_WHATSAPP)'}
        >
          <IconWhatsApp /> {submitLabel}
        </button>
        <p className="svc-fine">{fine || 'Opens WhatsApp with your details pre-filled — nothing is sent until you hit send.'}</p>
      </div>
    </div>
  )
}
