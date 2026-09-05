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

// New Apollo FREE job — name + Apollo people-search URL. Or "Add to existing list": point an
// existing list at a new Apollo search; the next Run appends the new leads into it (existing
// kept, deduped by apollo_contact_id). Runs in the user's own connected browser via the
// extension bridge; billing + the run are handled server-side.
export default function ApolloFreeNewJobModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const { onlineProfileId, apolloFreeJobs, refreshProfiles } = useApp()
  const [target, setTarget] = useState('new') // 'new' | 'existing'
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [existingId, setExistingId] = useState('')
  const [enrichMasked, setEnrichMasked] = useState(false)
  const [busy, setBusy] = useState(false)

  const sortedJobs = useMemo(
    () => [...(apolloFreeJobs || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [apolloFreeJobs],
  )
  const selectedJob = sortedJobs.find((j) => j.id === (existingId || sortedJobs[0]?.id))

  const submit = async () => {
    const u = url.trim()
    if (!u) return toast('Paste an Apollo people-search URL', 'err')
    if (!/apollo\.io/i.test(u)) return toast('That doesn’t look like an Apollo URL', 'err')
    // Freshen the server's online view so the profile we auto-bind is current at create time.
    await refreshProfiles().catch(() => {})
    // The job binds to the browser online RIGHT NOW (auto-selected via the extension — the profile
    // THIS browser is connected as, regardless of how many profiles the account has). If none is
    // connected here, block early instead of creating a job that could never run.
    if (!onlineProfileId) return toast('No connected browser found — open your Coldcast extension in this browser (set your API key until it shows “connected”), then try again.', 'err')

    setBusy(true)
    try {
      if (target === 'existing') {
        const id = existingId || sortedJobs[0]?.id
        if (!id) { setBusy(false); return toast('Select a list to add to', 'err') }
        const job = await api.apolloFreeAppend(id, { url: u, profileId: onlineProfileId, enrichMasked })
        onCreated?.(job)
        toast(`Added to “${selectedJob?.name || 'list'}” — click Run to scrape & append`, 'ok')
      } else {
        const job = await api.apolloFreeCreate({ name: name.trim() || 'Apollo Scrape', url: u, profileId: onlineProfileId, enrichMasked })
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
    <Modal open={open} onClose={onClose} title="🪶 New Apollo Job">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Turn an Apollo people-search into a clean, exportable lead list. It runs in your connected browser
        using your own Apollo session 👇
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
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SaaS Founders — US" />
        </div>
      ) : (
        <div className="fg">
          <label>
            📂 Select list <span style={subLabel}>— new leads get added here, duplicates removed</span>
          </label>
          {sortedJobs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '10px 0' }}>
              No lists yet — create one first.
            </div>
          ) : (
            <select value={existingId || sortedJobs[0]?.id || ''} onChange={(e) => setExistingId(e.target.value)} style={selStyle}>
              {sortedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} · {(j.totalLeads || j.totalScraped || 0).toLocaleString()} leads
                  {j.status === 'running' || j.status === 'stopping' ? '  (running)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

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

      {target === 'existing' && selectedJob && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4, marginBottom: 4, lineHeight: 1.5 }}>
          ℹ️ New leads are <b>appended</b> to this list and deduped — existing rows are kept.
        </div>
      )}

      {/* Opt-in: resolve masked rows (last name = initial, no LinkedIn) via serper.dev. */}
      <div className="fg">
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
          <input
            type="checkbox"
            checked={enrichMasked}
            onChange={(e) => setEnrichMasked(e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            🔍 Enrich masked profiles
            <span style={subLabel}> — for rows Apollo hides, find the LinkedIn URL &amp; full last name (slower; uses a search lookup per masked row)</span>
          </span>
        </label>
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy || (target === 'existing' && sortedJobs.length === 0)}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : target === 'existing' ? '➕ Add to list' : '🪶 Create Job'}
      </button>
    </Modal>
  )
}
