import { useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }

// New Company job — name + a LinkedIn Sales Navigator ACCOUNT (company) search URL.
// Posts to the Company scraper server; billing + the connected-browser run are handled
// server-side.
export default function CompanyNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId } = useApp()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const u = url.trim()
    if (!u) return toast('Paste a Sales Navigator company-search URL', 'err')
    if (!/linkedin\.com\/sales/i.test(u)) return toast('That doesn’t look like a Sales Navigator URL', 'err')

    setBusy(true)
    try {
      const job = await api.companyCreate({ name: name.trim() || 'Company Scrape', url: u, profileId: onlineProfileId })
      toast('Job created!', 'ok')
      onCreated?.(job)
      setUrl('')
      setName('')
      onClose()
    } catch (e) {
      toast(e.message || 'Something went wrong', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🏢 New Company Job">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Turn a Sales Navigator <b>account (company) search</b> into a clean, exportable company list —
        names, domains, size, industry — running in your connected browser 👇
      </p>

      <div className="fg">
        <label>
          🏷️ List name <span style={subLabel}>— a name you'll recognize later</span>
        </label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SaaS companies — US" />
      </div>

      <div className="fg">
        <label>
          🔗 Sales Navigator company-search URL <span style={subLabel}>— paste the account-search link</span>
        </label>
        <textarea
          rows="3"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/sales/search/company?..."
        />
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : '🏢 Create Job'}
      </button>
    </Modal>
  )
}
