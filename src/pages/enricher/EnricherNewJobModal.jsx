import { useState, useRef } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }

const PROVIDERS = [
  { v: 'auto', label: 'Auto — merge every logged-in provider (best coverage)' },
  { v: 'lusha', label: 'Lusha only' },
  { v: 'contactout', label: 'ContactOut only' },
  { v: 'salesql', label: 'SalesQL only' },
]

// New enricher job — upload a CSV of LinkedIn /in/ URLs (or paste them) + pick a
// provider. Multipart POST /api/upload; the job runs in your connected browser and
// bills 5 scrape credits per enriched row.
export default function EnricherNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId } = useApp()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [urls, setUrls] = useState('')
  const [provider, setProvider] = useState('auto')
  const [batchSize, setBatchSize] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setFile(null)
    setUrls('')
    setProvider('auto')
    setBatchSize('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!file && !urls.trim()) return toast('Upload a CSV or paste LinkedIn URLs', 'err')
    setBusy(true)
    try {
      const fd = new FormData()
      if (file) fd.append('file', file)
      else fd.append('urls', urls.trim())
      fd.append('provider', provider)
      if (batchSize) fd.append('batchSize', String(parseInt(batchSize, 10) || 10))
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
        Upload a CSV of LinkedIn profile URLs (or paste them). Each one is enriched in your connected
        browser using your own Lusha / ContactOut / SalesQL sessions — 5 credits per enriched row 👇
      </p>

      <div className="fg">
        <label>
          📄 CSV file <span style={subLabel}>— any CSV with a LinkedIn URL column</span>
        </label>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      <div className="fg">
        <label>
          🔗 …or paste URLs <span style={subLabel}>— one LinkedIn /in/ URL per line</span>
        </label>
        <textarea
          rows="3"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={'https://www.linkedin.com/in/johndoe\nhttps://www.linkedin.com/in/janedoe'}
          disabled={!!file}
        />
      </div>

      <div className="fg">
        <label>
          🧩 Provider <span style={subLabel}>— which source(s) to use</span>
        </label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p.v} value={p.v}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="fg">
        <label>
          ⚙️ Batch size <span style={subLabel}>— optional; rows enriched at once (default 10, max 25)</span>
        </label>
        <input type="number" min="1" max="25" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} placeholder="10" />
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '⏳ Uploading…' : '🔗 Start Enrichment'}
      </button>
    </Modal>
  )
}
