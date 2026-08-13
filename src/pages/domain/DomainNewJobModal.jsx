import { useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }

// New domain-enrichment job — upload a CSV of company domains (Company + Website columns).
// Runs in the user's connected browser via the bridge; billed 2 credits per input domain.
export default function DomainNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId } = useApp()
  const [name, setName] = useState('')
  const [fileName, setFileName] = useState('')
  const [csv, setCsv] = useState('')
  const [titles, setTitles] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [validation, setValidation] = useState(null) // { domains, skipped, tooMany, cap, error }
  const [validating, setValidating] = useState(false)
  const [busy, setBusy] = useState(false)

  const reset = () => { setName(''); setFileName(''); setCsv(''); setTitles(''); setValidation(null) }

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    setFileName(f.name)
    if (!name.trim()) setName(f.name.replace(/\.csv$/i, ''))
    const reader = new FileReader()
    reader.onload = async () => {
      const text = String(reader.result || '')
      setCsv(text)
      setValidating(true); setValidation(null)
      try { setValidation(await api.domainValidate(text)) }
      catch (err) { setValidation({ error: err.message || 'Could not read this CSV' }) }
      finally { setValidating(false) }
    }
    reader.readAsText(f)
  }

  const submit = async () => {
    if (!csv) return toast('Upload a CSV of company domains first', 'err')
    if (validation && validation.error) return toast(validation.error, 'err')
    if (validation && validation.tooMany) return toast(`Over the ${(validation.cap || 10000).toLocaleString()}-domain limit — split the file`, 'err')
    setBusy(true)
    try {
      const job = await api.domainCreate({
        name: name.trim() || fileName.replace(/\.csv$/i, '') || 'Domain Enrichment',
        csv,
        titles: titles.trim(),
        perPage: Number(perPage) || 10,
        profileId: onlineProfileId,
      })
      onCreated?.(job)
      toast('Job created — click Run to enrich', 'ok')
      reset()
      onClose()
    } catch (e) {
      toast(e.message || 'Something went wrong', 'err')
    } finally {
      setBusy(false)
    }
  }

  const ok = validation && !validation.error && !validation.tooMany
  const domainCount = validation && typeof validation.domains === 'number' ? validation.domains : 0

  return (
    <Modal open={open} onClose={onClose} title="🌐 New Domain Enrichment">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Upload a CSV with a <b>Company</b> and a <b>Website</b> column. We enrich each domain into
        firmographics + decision-maker contacts, scraped in your connected browser 👇
        <br /><span style={{ color: 'var(--text-faint)' }}>Billed 2 credits per domain · max 10,000 domains per upload.</span>
      </p>

      <div className="fg">
        <label>🏷️ List name <span style={subLabel}>— a name you'll recognize later</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 target accounts" />
      </div>

      <div className="fg">
        <label>📄 Domains CSV <span style={subLabel}>— Company + Website columns</span></label>
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
        {validating && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>⏳ Reading file…</div>}
        {validation && validation.error && (
          <div style={{ fontSize: 12.5, color: 'var(--red, #ef4444)', marginTop: 6 }}>⚠ {validation.error}</div>
        )}
        {ok && (
          <div style={{ fontSize: 12.5, color: 'var(--green, #16a34a)', marginTop: 6 }}>
            ✓ {domainCount.toLocaleString()} domain{domainCount === 1 ? '' : 's'} detected
            {validation.skipped ? ` · ${validation.skipped} skipped (no valid domain)` : ''}
          </div>
        )}
        {validation && validation.tooMany && (
          <div style={{ fontSize: 12.5, color: 'var(--red, #ef4444)', marginTop: 6 }}>
            ⚠ {domainCount.toLocaleString()} domains — over the {(validation.cap || 10000).toLocaleString()} limit. Split it into smaller files.
          </div>
        )}
      </div>

      <div className="fg">
        <label>🎯 Titles <span style={subLabel}>— optional; keep only these roles (comma-separated)</span></label>
        <textarea rows="2" value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="e.g. VP Sales, Head of Marketing, Founder" />
      </div>

      <div className="fg">
        <label>👥 Contacts per domain <span style={subLabel}>— cap per company (1–25)</span></label>
        <input
          type="number"
          min="1"
          max="25"
          step="1"
          value={perPage}
          onChange={(e) => setPerPage(e.target.value)}
          placeholder="e.g. 10"
          style={{ width: 140, maxWidth: '100%' }}
        />
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy || validating || !csv || (validation && (validation.error || validation.tooMany))}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : '🌐 Create Job'}
      </button>
    </Modal>
  )
}
