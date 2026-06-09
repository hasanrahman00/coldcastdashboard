import { useState } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { IconUser } from '../lib/icons.jsx'

function ProfileCard({ p, isActive, onActivate, onDelete }) {
  const online = !!p.online
  return (
    <div
      className={
        'rounded-2xl border bg-card p-4 transition ' +
        (isActive ? 'border-brand/40 ring-1 ring-brand/20' : 'border-line')
      }
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onActivate(p.id)}
          title={isActive ? 'Active profile' : 'Set as active profile'}
          className={
            'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ' +
            (isActive ? 'border-brand' : 'border-slate-300 hover:border-brand')
          }
        >
          {isActive && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
        </button>

        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <IconUser className="h-4.5 w-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{p.name || p.id}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium">
            <span className={'h-2 w-2 rounded-full ' + (online ? 'bg-emerald-500' : 'bg-amber-400')} />
            <span className={online ? 'text-emerald-600' : 'text-muted'}>
              {online ? 'Connected via extension' : 'Extension not connected'}
            </span>
          </div>
        </div>

        <button
          onClick={() => onDelete(p)}
          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
        >
          Delete
        </button>
      </div>

      {p.message && String(p.message).trim() && (
        <div className="mt-2.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
          ⚠ {p.message}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const { profiles, activeProfileId, activateProfile, deleteProfile } = useApp()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const anyOnline = profiles.some((p) => p.online)

  const onActivate = async (id) => {
    if (busy) return
    setBusy(true)
    try {
      await activateProfile(id)
      toast('Active profile set — new jobs will use it', 'ok')
    } catch (e) {
      toast(e.message || 'Action failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (p) => {
    const name = p.name || p.id
    if (
      !window.confirm(
        `Delete profile "${name}"? This removes it from the dashboard. Your Chrome and its LinkedIn login are untouched — reconnect the extension to re-create it.`,
      )
    )
      return
    try {
      await deleteProfile(p.id)
      toast('Profile deleted', 'ok')
    } catch (e) {
      toast(e.message || 'Delete failed', 'err')
    }
  }

  return (
    <div className="cc-card-in mx-auto max-w-3xl">
      <h2 className="text-xl font-extrabold tracking-tight text-ink">Settings</h2>
      <p className="mt-1 text-sm text-muted">
        Manage the browser-extension profiles that power your scraping jobs.
      </p>

      <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-faint">
        Profiles
      </h3>

      {profiles.length ? (
        <div className="space-y-3">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              p={p}
              isActive={p.id === activeProfileId}
              onActivate={onActivate}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-sm text-muted">
          No profiles yet. Install the Coldcast browser extension and connect it —
          your profile appears here automatically.
        </div>
      )}

      {profiles.length > 0 && !anyOnline && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Profile not connected. Open the Coldcast extension in your Chrome and make
          sure it shows “connected”.
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-sm font-bold text-ink">One-time setup</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Install the Coldcast Chrome extension.</li>
          <li>Open it and paste your API key (find it on the API key page).</li>
          <li>Once it shows “connected”, your profile appears above automatically.</li>
        </ol>
      </div>
    </div>
  )
}
