import { useApp } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { getSavedKey } from '../lib/api.js'
import { IconUsers, IconBolt, IconFile, IconPuzzle, IconKey, IconCopy } from '../lib/icons.jsx'

const EXT_URL = import.meta.env.VITE_EXT_DOWNLOAD_URL || ''

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        style={{ background: tint + '1a', color: tint }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-extrabold leading-none text-ink">{value}</div>
        <div className="mt-1 truncate text-xs font-medium text-muted">{label}</div>
      </div>
    </div>
  )
}

export default function StatsBox({ nav }) {
  const { jobs, profiles, connectorOnline, activeProfileId } = useApp()
  const toast = useToast()

  const totalLeads = jobs.reduce((s, j) => s + (j.totalLeads || 0), 0)
  const running = jobs.filter((j) => j.status === 'running').length

  // ── connection slot (mirrors the old "sbx-conn") ──
  const online = profiles.filter((p) => p.online)
  const active = profiles.find((p) => p.id === activeProfileId) || online[0]
  let connState = 'off'
  let connLabel = 'No profile — set up'
  if (connectorOnline && online.length) {
    connState = 'on'
    connLabel = active?.name || `${online.length} connected`
  } else if (profiles.length) {
    connLabel = 'Not connected'
  }

  const savedKey = getSavedKey()
  const keyShort = savedKey
    ? savedKey.length > 22
      ? savedKey.slice(0, 8) + '…' + savedKey.slice(-6)
      : savedKey
    : 'Open API key →'

  const copyKey = () => {
    if (!savedKey) return nav('api')
    navigator.clipboard
      ?.writeText(savedKey)
      .then(() => toast('API key copied', 'ok'))
      .catch(() => toast('Copy failed — open the API key page', 'err'))
  }

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
      <Stat icon={IconFile} label="Total jobs" value={jobs.length} tint="#4f7cf5" />
      <Stat icon={IconUsers} label="Leads scraped" value={totalLeads.toLocaleString()} tint="#059669" />
      <Stat icon={IconBolt} label="Running now" value={running} tint="#ea580c" />

      {/* connection + extension + api-key cluster */}
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => nav('settings')}
            className="flex items-center gap-2 text-sm font-semibold"
            title="Manage profiles in Settings"
          >
            <span
              className={
                'h-2.5 w-2.5 rounded-full ' +
                (connState === 'on' ? 'bg-emerald-500' : 'bg-rose-400')
              }
            />
            <span className={connState === 'on' ? 'text-ink' : 'text-rose-600'}>
              {connLabel}
            </span>
          </button>

          {EXT_URL ? (
            <a
              href={EXT_URL}
              className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-2.5 py-1 text-xs font-bold text-brand transition hover:bg-brand/10"
            >
              <IconPuzzle className="h-3.5 w-3.5" /> Get extension
            </a>
          ) : (
            <span
              title="Download link not set yet (VITE_EXT_DOWNLOAD_URL)"
              className="flex cursor-default items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-2.5 py-1 text-xs font-bold text-faint"
            >
              <IconPuzzle className="h-3.5 w-3.5" /> Get extension
            </span>
          )}
        </div>

        <button
          onClick={copyKey}
          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-left transition hover:bg-slate-100"
          title={savedKey ? 'Copy API key' : 'Open API key page'}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <IconKey className="h-3.5 w-3.5" /> API key
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-ink">
            {keyShort}
            {savedKey && <IconCopy className="h-3.5 w-3.5 text-faint" />}
          </span>
        </button>
      </div>
    </section>
  )
}
