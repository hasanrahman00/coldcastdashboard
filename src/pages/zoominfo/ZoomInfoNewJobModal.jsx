import { useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }
const selStyle = { width: '100%', background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', font: 'inherit', fontSize: 14 }

// New ZoomInfo job — a list name + a ZoomInfo Lite people/company search URL. Runs in the
// user's connected browser via the bridge; billing is per row scraped (Core).
export default function ZoomInfoNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId } = useApp()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(20)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const u = url.trim()
    if (!u) return toast('Paste a ZoomInfo search URL', 'err')
    if (!/zoominfo\.com/i.test(u)) return toast('That doesn’t look like a ZoomInfo URL', 'err')

    setBusy(true)
    try {
      const job = await api.zoominfoCreate({ name: name.trim() || 'ZoomInfo Export', searchUrl: u, maxPages: Number(maxPages) || 20, profileId: onlineProfileId })
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
    <Modal open={open} onClose={onClose} title="🔎 New ZoomInfo Job">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Export a ZoomInfo <b>Lite people or company search</b> into a clean CSV/XLSX — names, titles,
        companies, firmographics — scraped in your connected browser 👇
      </p>

      <div className="fg">
        <label>🏷️ List name <span style={subLabel}>— a name you'll recognize later</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VPs of Eng — SaaS" />
      </div>

      <div className="fg">
        <label>🔗 ZoomInfo search URL <span style={subLabel}>— the Lite people/company search link</span></label>
        <textarea rows="3" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://zi-lite.zoominfo.com/#/search/people?query=…" />
      </div>

      <div className="fg">
        <label>📄 Max pages <span style={subLabel}>— 25 rows per page</span></label>
        <select value={maxPages} onChange={(e) => setMaxPages(e.target.value)} style={selStyle}>
          {[5, 10, 20, 40, 100].map((n) => <option key={n} value={n}>{n} pages (~{n * 25} rows)</option>)}
        </select>
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : '🔎 Create Job'}
      </button>
    </Modal>
  )
}
