import { useState, useEffect } from 'react'
import Modal from '../../components/Modal.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { IconPlus } from '../../lib/icons.jsx'

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
const radioWrap = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 12px',
  cursor: 'pointer',
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  background: 'var(--bg-elev-2)',
}
const subLabel = { color: 'var(--text-faint)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }

export default function NewJobModal({ open, onClose }) {
  const { profiles, activeProfileId, createJob, refreshProfiles } = useApp()
  const toast = useToast()

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [profileId, setProfileId] = useState('')
  const [mode, setMode] = useState('without_signal')
  const [busy, setBusy] = useState(false)

  // Refresh the profile list whenever the modal opens.
  useEffect(() => {
    if (open) refreshProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Default the dropdown to the active profile (or first) — re-runs when the
  // freshly-fetched profiles arrive, so it never sticks on empty. Preserves a
  // choice the user already made.
  useEffect(() => {
    if (!open) return
    setProfileId((prev) =>
      prev && profiles.some((p) => p.id === prev) ? prev : activeProfileId || profiles[0]?.id || '',
    )
  }, [open, profiles, activeProfileId])

  const makeJob = async () => {
    if (!profileId) return toast('Pick a profile to run this job on', 'err')
    const u = url.trim()
    if (!u) return toast('Enter a LinkedIn URL', 'err')
    setBusy(true)
    try {
      await createJob({ name: name.trim() || 'Untitled', url: u, profileId, mode })
      toast('Job created!', 'ok')
      setName('')
      setUrl('')
      onClose()
    } catch (e) {
      toast(e.message || 'Could not create job', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Job">
      <div className="fg">
        <label>List Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landscaping Leads — US" />
      </div>

      <div className="fg">
        <label>LinkedIn Sales Nav URL</label>
        <textarea
          rows="3"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/sales/search/people?query=..."
        />
      </div>

      <div className="fg">
        <label>
          Run with profile <span style={subLabel}>— which Chrome to use</span>
        </label>
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)} style={selStyle}>
          {profiles.length === 0 && <option value="">— Select a profile —</option>}
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.id}
              {p.online ? '  • connected' : '  • offline'}
            </option>
          ))}
        </select>
      </div>

      <div className="fg">
        <label>
          Mode <span style={subLabel}>— what to capture</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={radioWrap}>
            <input
              type="radio"
              name="jobMode"
              value="without_signal"
              checked={mode === 'without_signal'}
              onChange={() => setMode('without_signal')}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Without Signal</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, marginTop: 2 }}>
                Standard contact data. Faster.
              </div>
            </div>
          </label>
          <label style={radioWrap}>
            <input
              type="radio"
              name="jobMode"
              value="with_signal"
              checked={mode === 'with_signal'}
              onChange={() => setMode('with_signal')}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>With Signal</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, marginTop: 2 }}>
                Adds badges (mutual conn., recently hired, etc.) + post text. Slower, safer pacing.
              </div>
            </div>
          </label>
        </div>
      </div>

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12 }}
        disabled={busy}
        onClick={makeJob}
      >
        <IconPlus />
        {busy ? 'Creating…' : 'Create Job'}
      </button>
    </Modal>
  )
}
