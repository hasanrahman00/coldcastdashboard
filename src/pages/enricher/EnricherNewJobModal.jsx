import { useState, useRef } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { IconUpload } from '../../lib/icons.jsx'

// New enricher job — one-click: just drop a CSV of LinkedIn profile URLs. Multipart
// POST /api/upload; the job runs in your connected browser and bills 5 credits per
// enriched row. Provider defaults to "auto" (merge every logged-in source) and batch
// size to the server default — no knobs, to keep it a single upload + button.
export default function EnricherNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId } = useApp()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  const pick = (f) => { if (f) setFile(f) }
  const reset = () => { setFile(null); if (fileRef.current) fileRef.current.value = '' }

  const submit = async () => {
    if (!file) return toast('Choose a CSV to upload', 'err')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('provider', 'auto') // merge every logged-in source (best coverage)
      if (onlineProfileId) fd.append('profileId', onlineProfileId)
      const r = await api.enricherUpload(fd)
      toast(`Job started — ${r.total || 0} URLs`, 'ok')
      onCreated?.(r)
      reset()
      onClose()
    } catch (e) {
      toast(e.message || 'Upload failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🔗 New LinkedIn Enrichment">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Drop a CSV of LinkedIn profile URLs. Each row is enriched in your connected browser using your
        own Lusha / ContactOut / SalesQL sessions — 5 credits per enriched row.
      </p>

      <div
        className={'uz' + (drag ? ' drag' : '')}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
      >
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => pick(e.target.files?.[0] || null)} />
        <IconUpload />
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>Drop a CSV here, or click to choose</div>

        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6, textAlign: 'left', display: 'inline-block' }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Required column:</strong> <strong style={{ fontFamily: 'var(--mono)' }}>Person Linkedin Url</strong> — LinkedIn profile URLs
            {' '}(any column with <span style={{ fontFamily: 'var(--mono)' }}>linkedin.com/in/…</span> is auto-detected).
          </div>
          <div style={{ marginTop: 3 }}>
            <strong style={{ color: 'var(--text-muted)' }}>Optional:</strong> First Name, Last Name, Title,
            Company, Location — improve match accuracy.
          </div>
        </div>

        {file && <div className="uz-f">✓ {file.name}</div>}
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy || !file}
        onClick={submit}
      >
        {busy ? '⏳ Uploading…' : '🔗 Start Enrichment'}
      </button>
    </Modal>
  )
}
