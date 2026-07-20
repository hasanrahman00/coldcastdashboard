import { useState } from 'react'
import { IconZap } from '../../lib/icons.jsx'
import ServicePage, { isEmail } from './ServicePage.jsx'

const selStyle = {
  width: '100%',
  background: 'var(--bg-elev-2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '11px 14px',
  color: 'var(--text)',
  font: 'inherit',
  fontSize: 14,
}

// "Request a feature or report a bug" — users tell us what to fix or build next,
// including new scrapers. Lead-capture form → WhatsApp.
export default function RequestFeature() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState('Feature request')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [product, setProduct] = useState('')

  const valid = name.trim() && isEmail(email) && title.trim() && details.trim()

  const buildMessage = () =>
    `Hi Coldcast — I have a ${type.toLowerCase()}.\n\n` +
    `Name: ${name.trim()}\n` +
    `Email: ${email.trim()}\n` +
    `Type: ${type}\n` +
    (product.trim() ? `Product / area: ${product.trim()}\n` : '') +
    `Title: ${title.trim()}\n` +
    `\nDetails:\n${details.trim()}\n`

  return (
    <ServicePage
      hero={{
        icon: IconZap,
        badge: 'We listen',
        title: 'Request a feature or report a bug',
        subtitle: 'Tell us what to fix or build next — including brand-new scrapers. The roadmap is yours to shape.',
        formTitle: 'What’s on your mind?',
        points: [
          'Report a bug so we can fix it fast',
          'Request a feature or improvement',
          'Suggest a new scraper or data source',
        ],
      }}
      submitLabel="Send request on WhatsApp"
      valid={valid}
      buildMessage={buildMessage}
    >
      <div className="svc-row">
        <div className="fg">
          <label>Full name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="fg">
          <label>Work email *</label>
          <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
        </div>
      </div>
      <div className="svc-row">
        <div className="fg">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={selStyle}>
            <option>Feature request</option>
            <option>Bug report</option>
            <option>New scraper</option>
          </select>
        </div>
        <div className="fg">
          <label>Product / area</label>
          <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Sales Nav, Apollo, dashboard…" />
        </div>
      </div>
      <div className="fg">
        <label>Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
      </div>
      <div className="fg">
        <label>Details *</label>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened / what you'd like, steps to reproduce a bug, the source you want scraped…" />
      </div>
    </ServicePage>
  )
}
