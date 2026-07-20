import { useState } from 'react'
import { IconAtSign } from '../../lib/icons.jsx'
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

// "Cold email infrastructure, done for you" — we provision domains + mailboxes
// (Google Workspace / Outlook / custom SMTP), warm them up, and connect them to the
// user's cold outreach platform. Lead-capture form → WhatsApp.
export default function ColdInfraSetup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [domains, setDomains] = useState('')
  const [mailboxes, setMailboxes] = useState('')
  const [provider, setProvider] = useState('Google Workspace')
  const [warmup, setWarmup] = useState(true)
  const [platform, setPlatform] = useState('')
  const [notes, setNotes] = useState('')

  const valid = name.trim() && isEmail(email) && (domains.trim() || mailboxes.trim())

  const buildMessage = () =>
    `Hi Coldcast — I’d like cold email infrastructure set up.\n\n` +
    `Name: ${name.trim()}\n` +
    `Email: ${email.trim()}\n` +
    `\n— Setup —\n` +
    (domains.trim() ? `Domains: ${domains.trim()}\n` : '') +
    (mailboxes.trim() ? `Mailboxes: ${mailboxes.trim()}\n` : '') +
    `Mailbox provider: ${provider}\n` +
    `Warmup: ${warmup ? 'Yes' : 'No'}\n` +
    (platform.trim() ? `Connect to outreach platform: ${platform.trim()}\n` : '') +
    (notes.trim() ? `\nNotes: ${notes.trim()}\n` : '')

  return (
    <ServicePage
      title="Cold Infrastructure"
      hero={{
        icon: IconAtSign,
        badge: 'Done for you',
        title: 'Cold email infrastructure, done for you',
        subtitle: 'Domains, mailboxes, and warmup — provisioned and wired straight into your cold outreach platform.',
        formTitle: 'What should we set up?',
        points: [
          'Domains + Google Workspace / Outlook / custom SMTP mailboxes',
          'Warmup included so you land in the inbox',
          'Connected to your cold outreach platform',
        ],
      }}
      submitLabel="Request setup on WhatsApp"
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
          <label>How many domains?</label>
          <input type="text" inputMode="numeric" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="e.g. 5" />
        </div>
        <div className="fg">
          <label>How many mailboxes?</label>
          <input type="text" inputMode="numeric" value={mailboxes} onChange={(e) => setMailboxes(e.target.value)} placeholder="e.g. 15" />
        </div>
      </div>
      <div className="fg">
        <label>Mailbox provider</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} style={selStyle}>
          <option>Google Workspace</option>
          <option>Microsoft Outlook / 365</option>
          <option>Custom SMTP</option>
          <option>Mixed / not sure</option>
        </select>
      </div>
      <div className="fg">
        <label>Cold outreach platform to connect</label>
        <input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Instantly, Smartlead, Apollo, Lemlist…" />
      </div>
      <div className="fg">
        <label className="svc-check">
          <input type="checkbox" checked={warmup} onChange={(e) => setWarmup(e.target.checked)} />
          Include warmup on every mailbox
        </label>
      </div>
      <div className="fg">
        <label>Anything else</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Timeline, sending volume, existing domains…" />
      </div>
    </ServicePage>
  )
}
