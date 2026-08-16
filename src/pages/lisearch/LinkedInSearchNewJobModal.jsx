import { useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }
const selStyle = { width: 140, maxWidth: '100%', background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', font: 'inherit', fontSize: 14 }

const isSearchUrl = (u) => /linkedin\.com\/(search\/results\/(people|services)|services)/i.test(u)

// New LinkedIn Search job — a list name + a LinkedIn People or Services search URL,
// with optional enrichment. Runs in the user's connected browser via the bridge.
export default function LinkedInSearchNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId } = useApp()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [maxResults, setMaxResults] = useState(100)
  const [enrich, setEnrich] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const u = url.trim()
    if (!u) return toast('Paste a LinkedIn search URL', 'err')
    if (!isSearchUrl(u)) return toast('That doesn’t look like a LinkedIn People or Services search URL', 'err')

    setBusy(true)
    try {
      const job = await api.lisearchCreate({
        name: name.trim() || 'LinkedIn Search',
        searchUrl: u,
        maxResults: Number(maxResults) || 100,
        enrich,
        profileId: onlineProfileId,
      })
      onCreated?.(job)
      toast('Job created — click Run to scrape', 'ok')
      setUrl(''); setName('')
      onClose()
    } catch (e) {
      toast(e.message || 'Something went wrong', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🕵️ New LinkedIn Search Job">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Export a LinkedIn <b>People</b> or <b>Services</b> search into a clean CSV — names, headlines,
        locations, profile URLs — scraped in your connected browser 👇
      </p>

      <div className="fg">
        <label>🏷️ List name <span style={subLabel}>— a name you'll recognize later</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fractional CMOs — London" />
      </div>

      <div className="fg">
        <label>🔗 LinkedIn search URL <span style={subLabel}>— a People or Services results link</span></label>
        <textarea rows="3" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/search/results/people/?keywords=…" />
      </div>

      <div className="fg">
        <label>🔢 Max results <span style={subLabel}>— rows to collect</span></label>
        <input type="number" min="1" max="1000" step="1" value={maxResults} onChange={(e) => setMaxResults(e.target.value)} placeholder="e.g. 100" style={selStyle} />
      </div>

      <div className="fg">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
          <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} style={{ width: 16, height: 16 }} />
          <span>✉️ Enrich contacts <span style={subLabel}>— add email + company via Lusha / ContactOut / SalesQL (sign in to those in this browser)</span></span>
        </label>
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : '🕵️ Create Job'}
      </button>
    </Modal>
  )
}
