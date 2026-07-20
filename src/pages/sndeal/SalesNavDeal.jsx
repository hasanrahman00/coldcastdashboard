import { useState } from 'react'
import { IconWhatsApp } from '../../lib/icons.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { BUSINESS_WHATSAPP } from '../../lib/whatsapp.js'

// LinkedIn Sales Navigator "75% OFF" offer — a lead-capture page (not a scraper).
// The user drops their details and the button opens WhatsApp to our business number
// with everything pre-filled, so they can claim the deal in one tap.

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export default function SalesNavDeal() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [email, setEmail] = useState('')
  const [wa, setWa] = useState('')

  const waDigits = wa.replace(/\D/g, '')
  const valid = name.trim() && isEmail(email.trim()) && waDigits.length >= 7
  const configured = BUSINESS_WHATSAPP.length >= 7

  const connect = () => {
    if (!valid) return toast('Add your name, a valid email and WhatsApp number', 'err')
    if (!configured) return toast('WhatsApp isn’t configured yet — set VITE_DEAL_WHATSAPP', 'err')
    const msg =
      `Hi! I want the LinkedIn Sales Navigator 75% OFF deal.\n\n` +
      `Name: ${name.trim()}\n` +
      (linkedin.trim() ? `LinkedIn: ${linkedin.trim()}\n` : '') +
      `LinkedIn account email: ${email.trim()}\n` +
      `WhatsApp: +${waDigits}`
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  return (
    <div className="deal-wrap">
      <div className="deal-hero">
        <span className="deal-off">75% OFF</span>
        <h3>LinkedIn Sales Navigator, activated on your own account</h3>
        <p>A full Sales Navigator subscription at 75% off list price. Drop your details and we’ll set it up with you over WhatsApp — takes minutes.</p>
        <ul className="deal-points">
          <li>Real subscription on your own LinkedIn account</li>
          <li>75% cheaper than list price</li>
          <li>Set up in minutes over WhatsApp</li>
        </ul>
      </div>

      <div className="deal-card">
        <h4>Claim the deal</h4>

        <div className="fg">
          <label>Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="fg">
          <label>LinkedIn profile</label>
          <input type="text" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/janedoe" />
        </div>
        <div className="fg">
          <label>LinkedIn account email</label>
          <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="the email you sign in to LinkedIn with" />
        </div>
        <div className="fg">
          <label>WhatsApp number</label>
          <input type="text" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="+1 555 123 4567" />
        </div>

        <button className="btn btn-wa" onClick={connect} disabled={!valid} title={configured ? '' : 'WhatsApp number not configured yet'}>
          <IconWhatsApp /> Connect on WhatsApp
        </button>
        <p className="deal-fine">Opens WhatsApp with your details pre-filled — nothing is sent until you hit send.</p>
      </div>
    </div>
  )
}
