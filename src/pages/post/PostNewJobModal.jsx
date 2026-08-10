import { useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }

// New Post-engagers job — a list name + a LinkedIn post URL. Runs in the user's
// connected browser via the bridge; billing is per profile scraped (Core).
export default function PostNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId } = useApp()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const u = url.trim()
    if (!u) return toast('Paste a LinkedIn post URL', 'err')
    if (!/linkedin\.com|lnkd\.in/i.test(u)) return toast('That doesn’t look like a LinkedIn post URL', 'err')

    setBusy(true)
    try {
      const job = await api.postCreate({ name: name.trim() || 'Post Engagers', postUrl: u, profileId: onlineProfileId })
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
    <Modal open={open} onClose={onClose} title="👥 New Post-engagers Job">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Pull <b>everyone who reacted, commented, or reposted</b> a LinkedIn post into a clean CSV of
        profile URLs — scraped in your connected browser 👇
      </p>

      <div className="fg">
        <label>🏷️ List name <span style={subLabel}>— a name you'll recognize later</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engagers — Founder's launch post" />
      </div>

      <div className="fg">
        <label>🔗 LinkedIn post URL <span style={subLabel}>— the post/activity link (or an lnkd.in short link)</span></label>
        <textarea rows="3" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/…  or  https://www.linkedin.com/feed/update/urn:li:activity:…" />
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : '👥 Create Job'}
      </button>
    </Modal>
  )
}
