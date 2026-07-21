import { useState, useEffect, useMemo } from 'react'
import Modal from '../../components/Modal.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'

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
// Selectable-card style for the radio pickers. Highlights the active choice with
// a brand border + glow so non-technical users can clearly see what's selected.
const card = (active) => ({
  ...radioWrap,
  borderColor: active ? 'var(--brand)' : 'var(--border)',
  boxShadow: active ? '0 0 0 3px rgba(99,102,241,.15)' : 'none',
  transition: 'border-color .15s, box-shadow .15s',
})

export default function NewJobModal({ open, onClose }) {
  const { jobs, profiles, activeProfileId, localExt, createJob, appendJob, refreshProfiles } = useApp()
  const toast = useToast()

  const [target, setTarget] = useState('new') // 'new' | 'existing'
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [profileId, setProfileId] = useState('')
  const [mode, setMode] = useState('without_signal')
  const [speed, setSpeed] = useState('fast')
  const [existingId, setExistingId] = useState('')
  const [busy, setBusy] = useState(false)

  // Existing lists, newest first. (You can append even into a finished list.)
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [jobs],
  )
  const selectedJob = sortedJobs.find((j) => j.id === existingId)

  useEffect(() => {
    if (open) refreshProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Default the profile to the active one (or first); default the existing-list
  // dropdown to the newest list. Re-runs when fresh data arrives.
  useEffect(() => {
    if (!open) return
    setProfileId((prev) => {
      // Default to a CONNECTED browser so the job targets one that's actually
      // online: keep the current pick if still online → THIS BROWSER (the
      // dashboard's own extension) → the active profile if online → any online
      // → fall back to active/first so the dropdown is never empty.
      const isOnline = (id) => id && profiles.some((p) => p.id === id && (p.online || p.bridge))
      const firstOnline = profiles.find((p) => p && (p.online || p.bridge))
      if (isOnline(prev)) return prev
      if (isOnline(localExt.profileId)) return localExt.profileId
      if (isOnline(activeProfileId)) return activeProfileId
      if (firstOnline) return firstOnline.id
      return prev && profiles.some((p) => p.id === prev) ? prev : activeProfileId || profiles[0]?.id || ''
    })
    setExistingId((prev) => (prev && sortedJobs.some((j) => j.id === prev) ? prev : sortedJobs[0]?.id || ''))
  }, [open, profiles, activeProfileId, localExt.profileId, sortedJobs])

  const submit = async () => {
    if (!profileId) return toast('Pick a profile to run on', 'err')
    const u = url.trim()
    if (!u) return toast('Enter a LinkedIn Sales Nav URL', 'err')
    // Must be a Sales Navigator URL — reject Apollo / plain LinkedIn / anything else early.
    if (!/linkedin\.com\/sales\//i.test(u)) {
      return toast('⚠️ That isn’t a Sales Navigator URL. Paste a link that starts with https://www.linkedin.com/sales/…', 'err')
    }

    setBusy(true)
    try {
      if (target === 'existing') {
        if (!existingId) {
          setBusy(false)
          return toast('Select a list to add to', 'err')
        }
        await appendJob(existingId, { url: u, profileId })
        toast(`Added to “${selectedJob?.name || 'list'}” — click Run to scrape & append`, 'ok')
      } else {
        await createJob({ name: name.trim() || 'Untitled', url: u, profileId, mode, speed })
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
    <Modal open={open} onClose={onClose} title="🚀 New Job">
      <p style={{ margin: '-2px 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Turn a LinkedIn Sales Navigator search into a clean, exportable lead list — just fill in the steps below 👇
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
          <label>🏷️ List name <span style={subLabel}>— a name you'll recognize later</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landscaping Leads — US" />
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
            <select value={existingId} onChange={(e) => setExistingId(e.target.value)} style={selStyle}>
              {sortedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} · {(j.totalLeads || 0).toLocaleString()} leads
                  {j.status === 'running' || j.status === 'stopping' ? '  (running)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="fg">
        <label>🔗 LinkedIn Sales Nav URL <span style={subLabel}>— paste the search link from your browser</span></label>
        <textarea
          rows="3"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/sales/search/people?query=..."
        />
      </div>

      <div className="fg">
        <label>
          🖥️ Run with profile <span style={subLabel}>— which connected browser to use</span>
        </label>
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)} style={selStyle}>
          {profiles.length === 0 && <option value="">— Select a profile —</option>}
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.id}
              {p.online ? '  🟢 connected' : '  ⚪ offline'}
            </option>
          ))}
        </select>
      </div>

      {target === 'new' && (
        <div className="fg">
          <label>
            ⏱️ Scraper speed <span style={subLabel}>— how fast it moves between pages</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={card(speed === 'fast')}>
              <input type="radio" name="jobSpeed" value="fast" checked={speed === 'fast'} onChange={() => setSpeed('fast')} style={{ marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>⚡ Fast</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, marginTop: 2 }}>
                  Quicker — 5–10s per page.
                </div>
              </div>
            </label>
            <label style={card(speed === 'normal')}>
              <input type="radio" name="jobSpeed" value="normal" checked={speed === 'normal'} onChange={() => setSpeed('normal')} style={{ marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🛡️ Normal</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, marginTop: 2 }}>
                  Safer, more human — 12–20s per page.
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {target === 'new' ? (
        <div className="fg">
          <label>
            🎛️ Mode <span style={subLabel}>— what to capture</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={card(mode === 'without_signal')}>
              <input
                type="radio"
                name="jobMode"
                value="without_signal"
                checked={mode === 'without_signal'}
                onChange={() => setMode('without_signal')}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>📇 Without Signal</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, marginTop: 2 }}>
                  Standard contact data. Faster.
                </div>
              </div>
            </label>
            <label style={card(mode === 'with_signal')}>
              <input
                type="radio"
                name="jobMode"
                value="with_signal"
                checked={mode === 'with_signal'}
                onChange={() => setMode('with_signal')}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🎯 With Signal</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, marginTop: 2 }}>
                  Adds badges (mutual connections, recently hired…) + post text. Slower, safer.
                </div>
              </div>
            </label>
          </div>
        </div>
      ) : (
        selectedJob && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4, marginBottom: 4, lineHeight: 1.5 }}>
            ℹ️ New leads are <b>appended</b> to this list and deduped — existing rows are kept. Mode stays{' '}
            <b>{selectedJob.mode === 'with_signal' ? 'With Signal' : 'Without Signal'}</b> (the list's own).
          </div>
        )
      )}

      <button
        className="btn btn-p"
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12, fontSize: 15, fontWeight: 600 }}
        disabled={busy || (target === 'existing' && !existingId)}
        onClick={submit}
      >
        {busy ? '⏳ Saving…' : target === 'existing' ? '➕ Add to list' : '🚀 Create Job'}
      </button>
    </Modal>
  )
}
