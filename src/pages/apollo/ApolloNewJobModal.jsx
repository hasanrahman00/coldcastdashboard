import { useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }

// New Apollo job — name + Apollo people-search URL (+ optional max pages). Posts to
// the Apollo server; billing + the connected-browser run are handled server-side.
export default function ApolloNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const u = url.trim()
    if (!u) return toast('Paste an Apollo people-search URL', 'err')
    if (!/apollo\.io/i.test(u)) return toast('That doesn’t look like an Apollo URL', 'err')

    setBusy(true)
    try {
      const job = await api.apolloCreate({
        name: name.trim() || 'Apollo Scrape',
        url: u,
        ...(maxPages ? { maxPages: parseInt(maxPages, 10) || undefined } : {}),
      })
      toast('Job created!', 'ok')
      onCreated?.(job)
      setUrl('')
      setName('')
      setMaxPages('')
      onClose()
    } catch (e) {
      toast(e.message || 'Something went wrong', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🪶 New Apollo Job">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Turn an Apollo people-search into a clean, exportable lead list. It runs in your connected browser
        using your own Apollo session 👇
      </p>

      <div className="fg">
        <label>
          🏷️ List name <span style={subLabel}>— a name you'll recognize later</span>
        </label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SaaS Founders — US" />
      </div>

      <div className="fg">
        <label>
          🔗 Apollo search URL <span style={subLabel}>— paste the people-search link from Apollo</span>
        </label>
        <textarea
          rows="3"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://app.apollo.io/#/people?personTitles[]=..."
        />
      </div>

      <div className="fg">
        <label>
          📄 Max pages <span style={subLabel}>— optional; blank = all (25 leads per page)</span>
        </label>
        <input type="number" min="1" value={maxPages} onChange={(e) => setMaxPages(e.target.value)} placeholder="100" />
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : '🪶 Create Job'}
      </button>
    </Modal>
  )
}
