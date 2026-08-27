import { useState, useMemo } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import { useApp } from '../../store/AppStore.jsx'

const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }
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

// New Company job — name + a LinkedIn Sales Navigator ACCOUNT (company) search URL.
// Or "Add to existing list": point an existing list at a new search; the next Run
// appends the new companies into it (existing kept, deduped by companyId). Posts to
// the Company scraper server; billing + the connected-browser run are handled server-side.
export default function CompanyNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId, companyJobs } = useApp()
  const [target, setTarget] = useState('new') // 'new' | 'existing'
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [existingId, setExistingId] = useState('')
  const [busy, setBusy] = useState(false)

  const sortedJobs = useMemo(
    () => [...(companyJobs || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [companyJobs],
  )
  const selectedJob = sortedJobs.find((j) => j.id === (existingId || sortedJobs[0]?.id))

  const submit = async () => {
    const u = url.trim()
    if (!u) return toast('Paste a Sales Navigator company-search URL', 'err')
    if (!/linkedin\.com\/sales/i.test(u)) return toast('That doesn’t look like a Sales Navigator URL', 'err')
    // The job binds to the browser online RIGHT NOW (auto-selected via the extension). If none is
    // connected here, onlineProfileId is null — creating the job would post profileId:null and it
    // could never run. Block early with a clear message instead of a silent dead job.
    if (!onlineProfileId) return toast('No connected browser found — open your Coldcast extension in this browser (set your API key until it shows “connected”), then try again.', 'err')

    setBusy(true)
    try {
      if (target === 'existing') {
        const id = existingId || sortedJobs[0]?.id
        if (!id) { setBusy(false); return toast('Select a list to add to', 'err') }
        const job = await api.companyAppend(id, { url: u, profileId: onlineProfileId })
        onCreated?.(job)
        toast(`Added to “${selectedJob?.name || 'list'}” — click Run to scrape & append`, 'ok')
      } else {
        const job = await api.companyCreate({ name: name.trim() || 'Company Scrape', url: u, profileId: onlineProfileId })
        onCreated?.(job)
        toast('Job created!', 'ok')
      }
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

      {/* New list vs add-to-existing */}
      <div className="tabs">
        <button type="button" className={'tab' + (target === 'new' ? ' on' : '')} onClick={() => setTarget('new')}>
          🆕 New list
        </button>
        <button type="button" className={'tab' + (target === 'existing' ? ' on' : '')} onClick={() => setTarget('existing')}>
          ➕ Add to existing
        </button>
      </div>

      {target === 'new' ? (
        <div className="fg">
          <label>
            🏷️ List name <span style={subLabel}>— a name you'll recognize later</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SaaS companies — US" />
        </div>
      ) : (
        <div className="fg">
          <label>
            📂 Select list <span style={subLabel}>— new companies get added here, duplicates removed</span>
          </label>
          {sortedJobs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '10px 0' }}>
              No lists yet — create one first.
            </div>
          ) : (
            <select value={existingId || sortedJobs[0]?.id || ''} onChange={(e) => setExistingId(e.target.value)} style={selStyle}>
              {sortedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} · {(j.totalLeads || 0).toLocaleString()} companies
                  {j.status === 'running' || j.status === 'stopping' ? '  (running)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

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

      {target === 'existing' && selectedJob && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4, marginBottom: 4, lineHeight: 1.5 }}>
          ℹ️ New companies are <b>appended</b> to this list and deduped — existing rows are kept.
        </div>
      )}

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy || (target === 'existing' && sortedJobs.length === 0)}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : target === 'existing' ? '➕ Add to list' : '🏢 Create Job'}
      </button>
    </Modal>
  )
}
