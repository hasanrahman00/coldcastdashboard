import { useState, useEffect } from 'react'
import Modal from '../../components/Modal.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'

export default function NewJobModal({ open, onClose }) {
  const { profiles, activeProfileId, createJob, refreshProfiles } = useApp()
  const toast = useToast()

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [profileId, setProfileId] = useState('')
  const [mode, setMode] = useState('without_signal')
  const [busy, setBusy] = useState(false)

  // When the modal opens, refresh profiles + default the dropdown to the active
  // profile (or the first one). Don't clobber a choice the user already made.
  useEffect(() => {
    if (!open) return
    refreshProfiles()
    setProfileId((prev) => {
      if (prev && profiles.some((p) => p.id === prev)) return prev
      return activeProfileId || profiles[0]?.id || ''
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async () => {
    if (!profileId) return toast('Pick a profile to run this job on', 'err')
    const u = url.trim()
    if (!u) return toast('Enter a LinkedIn Sales Navigator URL', 'err')
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
    <Modal
      open={open}
      onClose={onClose}
      title="New scraping job"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create job'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Job name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SaaS founders — US"
            className="cc-input"
          />
        </Field>

        <Field label="Sales Navigator URL" required>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/sales/search/people?..."
            className="cc-input"
          />
        </Field>

        <Field label="Run on profile" required>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="cc-input"
          >
            {profiles.length ? (
              profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id}
                  {p.online ? '  • connected' : '  • offline'}
                </option>
              ))
            ) : (
              <option value="">No profiles — add one in Settings first</option>
            )}
          </select>
        </Field>

        <Field label="Mode">
          <div className="grid grid-cols-2 gap-2">
            <ModeOption
              checked={mode === 'without_signal'}
              onChange={() => setMode('without_signal')}
              title="Standard"
              desc="Fast scrape. Contact + company data."
            />
            <ModeOption
              checked={mode === 'with_signal'}
              onChange={() => setMode('with_signal')}
              title="With Signal"
              desc="Adds post signals. Slower, safer pace."
            />
          </div>
        </Field>
      </div>

      <style>{`
        .cc-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--color-line);
          background: #fff;
          padding: 0.6rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .cc-input:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px rgb(79 124 245 / 0.18);
        }
      `}</style>
    </Modal>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  )
}

function ModeOption({ checked, onChange, title, desc }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={
        'rounded-xl border p-3 text-left transition ' +
        (checked ? 'border-brand bg-brand/5 ring-1 ring-brand/20' : 'border-line hover:border-brand/40')
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            'grid h-4 w-4 place-items-center rounded-full border-2 ' +
            (checked ? 'border-brand' : 'border-slate-300')
          }
        >
          {checked && <span className="h-2 w-2 rounded-full bg-brand" />}
        </span>
        <span className="text-sm font-bold text-ink">{title}</span>
      </div>
      <p className="mt-1 pl-6 text-xs text-muted">{desc}</p>
    </button>
  )
}
