import { useState } from 'react'
import { IconUsers } from '../../lib/icons.jsx'
import ServicePage, { isEmail } from './ServicePage.jsx'

// "Hire our prospecting team" — the user hands us their ICP, we do the prospecting and
// deliver enriched lists. Pure lead-capture form (no scraping happens here).
export default function HireProspectTeam() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [titles, setTitles] = useState('')
  const [industries, setIndustries] = useState('')
  const [locations, setLocations] = useState('')
  const [size, setSize] = useState('')
  const [volume, setVolume] = useState('')
  const [notes, setNotes] = useState('')

  const valid = name.trim() && isEmail(email) && titles.trim()

  const buildMessage = () =>
    `Hi Coldcast — I’d like to hire your prospecting team.\n\n` +
    `Name: ${name.trim()}\n` +
    `Email: ${email.trim()}\n` +
    (company.trim() ? `Company / site: ${company.trim()}\n` : '') +
    `\n— My ICP —\n` +
    `Job titles: ${titles.trim()}\n` +
    (industries.trim() ? `Industries: ${industries.trim()}\n` : '') +
    (locations.trim() ? `Locations: ${locations.trim()}\n` : '') +
    (size.trim() ? `Company size: ${size.trim()}\n` : '') +
    (volume.trim() ? `Monthly volume: ${volume.trim()}\n` : '') +
    (notes.trim() ? `\nNotes: ${notes.trim()}\n` : '')

  return (
    <ServicePage
      hero={{
        icon: IconUsers,
        badge: 'Done for you',
        title: 'Hire our prospecting team',
        subtitle: 'Give us your ICP — we build and deliver enriched, verified lead lists, so your team just works the pipeline.',
        formTitle: 'Share your ICP',
        points: [
          'You define the ICP — we do the prospecting',
          'Verified emails & phone numbers',
          'Delivered to your inbox or CRM, ready to send',
        ],
      }}
      submitLabel="Send my ICP on WhatsApp"
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
      <div className="fg">
        <label>Company / website</label>
        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="company.com" />
      </div>
      <div className="fg">
        <label>Target job titles *</label>
        <input type="text" value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="CEO, Founder, Owner, VP Sales" />
      </div>
      <div className="svc-row">
        <div className="fg">
          <label>Industries</label>
          <input type="text" value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="SaaS, Agencies, Construction" />
        </div>
        <div className="fg">
          <label>Locations / regions</label>
          <input type="text" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="US, UK, UAE" />
        </div>
      </div>
      <div className="svc-row">
        <div className="fg">
          <label>Company size</label>
          <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="11–200 employees" />
        </div>
        <div className="fg">
          <label>Leads / month</label>
          <input type="text" inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 5,000" />
        </div>
      </div>
      <div className="fg">
        <label>Anything else</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Exclusions, sample accounts, tools you use…" />
      </div>
    </ServicePage>
  )
}
