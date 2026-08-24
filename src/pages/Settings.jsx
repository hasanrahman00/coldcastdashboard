import { useState } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { IconUsers, IconAtSign } from '../lib/icons.jsx'
import LocalExtBanner from '../components/LocalExtBanner.jsx'
import ProviderStatus from '../components/ProviderStatus.jsx'
import FreeAccountCard from '../components/FreeAccountCard.jsx'

function ProfileCard({ p, isActive, isThisBrowser, onActivate, onDelete, onRename }) {
  const online = !!p.online
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(p.name || '')
  const [saving, setSaving] = useState(false)

  const startEdit = () => { setDraft(p.name || ''); setEditing(true) }
  const cancelEdit = () => { if (!saving) setEditing(false) }
  const saveEdit = async () => {
    const name = draft.trim()
    if (!name || name === p.name) { setEditing(false); return } // no-op rename
    setSaving(true)
    // Only leave edit mode on success — on failure keep the card open with the
    // user's typed draft so they can retry without re-typing.
    try { if (await onRename(p.id, name)) setEditing(false) } finally { setSaving(false) }
  }

  return (
    <div className={'profile-card' + (isActive ? ' active' : '')}>
      <div className="profile-head">
        <div
          className={'profile-radio' + (isActive ? ' on' : '')}
          title={isActive ? 'Active profile' : 'Set as active profile'}
          onClick={() => onActivate(p.id)}
        />
        {editing ? (
          <input
            className="profile-rename"
            value={draft}
            autoFocus
            maxLength={80}
            disabled={saving}
            placeholder="Profile name"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              else if (e.key === 'Escape') cancelEdit()
            }}
          />
        ) : (
          <div className="profile-name">
            {p.name || p.id}
            {isThisBrowser && (
              <span className="this-browser-badge" title="The extension reporting this profile is installed in the browser you're using right now">
                This browser
              </span>
            )}
          </div>
        )}
        <div className="profile-actions">
          {editing ? (
            <>
              <button className="btn btn-p btn-sm" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-g btn-sm" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-g btn-sm" onClick={startEdit}>
                Rename
              </button>
              <button
                className="btn btn-g btn-sm"
                onClick={() => onDelete(p)}
                style={{ color: 'var(--red)', borderColor: 'rgba(244,63,94,.3)' }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      <div className="profile-stats">
        <span>
          <span className={'stat-dot ' + (online ? 'ok' : 'warn')} />
          {online ? 'Connected via extension' : 'Extension not connected'}
        </span>
      </div>
      {p.message && String(p.message).trim() && <div className="profile-msg">⚠ {p.message}</div>}
    </div>
  )
}

export default function Settings() {
  const { profiles, activeProfileId, activateProfile, renameProfile, deleteProfile, refreshProfiles, localExt } = useApp()
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

  const onRename = async (id, name) => {
    try {
      await renameProfile(id, name)
      toast('Profile renamed', 'ok')
      return true
    } catch (e) {
      toast(e.message || 'Rename failed', 'err')
      return false
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
    <>
      <LocalExtBanner />

      {/* Enrichment sources — moved here from the scraper pages so those stay clean. */}
      <div className="sbox">
        <div className="sbox-h">
          <div className="sbox-ic"><IconAtSign /></div>
          <h3>Enrichment sources</h3>
        </div>
        <p>
          Sign in to Lusha, ContactOut & SalesQL in <b>this browser</b> to enrich your scrapes —
          a free account for each is all the scraper needs.
        </p>
        <ProviderStatus exclude={['linkedin']} />

        <div className="enrich-sub">
          <div className="enrich-sub-h">Grab a free account</div>
          <p className="enrich-sub-p">
            Fetch a free account for any source you’re not signed into, then log in above. The credentials are yours to keep.
          </p>
          <div className="enrich-grid">
            <FreeAccountCard name="Lusha" source="lusha" />
            <FreeAccountCard name="SalesQL" source="salesql" warn="Sign up with your own Gmail — you need your own free account, then log in." />
            <FreeAccountCard name="ContactOut" source="contactout" warn="Sign up with your own Gmail — you need your own free account, then log in." />
          </div>
        </div>
      </div>

      {/* Profiles */}
      <div className="sbox">
        <div className="sbox-h">
          <div className="sbox-ic">
            <IconUsers />
          </div>
          <h3>Profiles</h3>
        </div>
        <p>
          Each profile = one LinkedIn account connected through the browser extension. To add another,
          connect the extension in a different Chrome profile.
        </p>

        <div className="profile-list">
          {profiles.length ? (
            profiles.map((p) => (
              <ProfileCard
                key={p.id}
                p={p}
                isActive={p.id === activeProfileId}
                isThisBrowser={!!localExt.profileId && p.id === localExt.profileId}
                onActivate={onActivate}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))
          ) : (
            <div className="profile-empty">
              No profiles yet. Install the browser extension and connect it (see <b>One-time setup</b>) —
              your profile appears here automatically.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-g" onClick={refreshProfiles} style={{ marginLeft: 'auto' }}>
            Refresh
          </button>
        </div>
        {profiles.length > 0 && !anyOnline && (
          <p className="setup-note" style={{ marginTop: 12 }}>
            Profile not connected. Open the Coldcast extension in your Chrome and make sure it shows
            “connected”.
          </p>
        )}
        <style>{`
          .this-browser-badge{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;border:1px solid rgba(79,124,245,.35);background:rgba(79,124,245,.10);color:var(--brand);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;vertical-align:middle}
          .profile-rename{flex:1;min-width:0;font:inherit;font-weight:600;font-size:14px;color:var(--text);padding:6px 10px;border:1px solid var(--brand);border-radius:8px;background:var(--bg-elev-1);outline:none}
          .profile-rename:disabled{opacity:.6}
        `}</style>
      </div>
    </>
  )
}
