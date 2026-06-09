import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import {
  IconPlay,
  IconStop,
  IconDownload,
  IconLogs,
  IconTrash,
  IconCalendar,
  IconUser,
  IconUsers,
  IconLink,
  IconPage,
  IconRetry,
  IconWarn,
} from '../../lib/icons.jsx'

function jobUrlOf(j) {
  let url = ''
  if (Array.isArray(j.urls) && j.urls.length) {
    const u = j.urls[0]
    url = typeof u === 'string' ? u : (u && (u.url || u.href)) || ''
  }
  return url || j.url || j.searchUrl || ''
}

function Btn({ onClick, disabled, title, tint, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45"
      style={{ borderColor: tint + '40', color: tint, background: tint + '0d' }}
    >
      {children}
    </button>
  )
}

export default function JobCard({ job, onOpenLogs }) {
  const { jobs, profiles, activeProfileId, uiConfig, startJob, stopJob, deleteJob, downloadUrl } = useApp()
  const toast = useToast()

  const scrapeIdle = ['idle', 'stopped', 'done', 'failed'].includes(job.status)
  const scrapeRun = job.status === 'running'
  const scrapeBusy = scrapeRun || job.status === 'stopping'
  const hasData = job.hasData || job.totalLeads > 0

  const anotherRunning = jobs.some(
    (x) => x.id !== job.id && (x.status === 'running' || x.status === 'stopping'),
  )

  const profile = profiles.find((p) => p.id === (job.profileId || activeProfileId))
  const profileLabel = profile ? profile.name || profile.id : job.profileId ? 'Unknown profile' : ''

  const url = jobUrlOf(job)
  const date = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // status line
  let stColor = '#64748b'
  let stText = 'Ready to run'
  let StIcon = IconRetry
  if (scrapeBusy) {
    stColor = '#4f7cf5'
    stText = job.status === 'stopping' ? 'Stopping…' : 'Scraping…'
  } else if (hasData) {
    stColor = '#059669'
    stText = 'File available'
  } else if (job.status === 'failed') {
    stColor = '#e11d48'
    stText = 'Failed'
    StIcon = IconWarn
  }

  const run = async () => {
    try {
      await startJob(job.id)
    } catch (e) {
      toast(e.message || 'Action failed', 'err')
    }
  }
  const stop = async () => {
    try {
      await stopJob(job.id)
    } catch (e) {
      toast(e.message || 'Action failed', 'err')
    }
  }
  const remove = async () => {
    const running = job.status === 'running' || job.status === 'stopping'
    const msg = running
      ? 'This job is still running. Delete it now? The scrape will be stopped and all its data removed.'
      : 'Delete this job and all its data?'
    if (!window.confirm(msg)) return
    try {
      await deleteJob(job.id)
    } catch (e) {
      toast(e.message || 'Delete failed', 'err')
    }
  }
  const dl = (fmt) => window.open(downloadUrl(job.id, fmt), '_blank')

  const pct = job.progress || 0

  return (
    <div className="cc-card-in flex min-h-[228px] flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:shadow-md">
      {/* title */}
      <div className="truncate text-[15px] font-bold text-ink">{job.name}</div>

      {/* status line */}
      <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: stColor }}>
        <StIcon className="h-4 w-4" />
        {stText}
      </div>

      {/* meta */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {date && (
          <span className="inline-flex items-center gap-1">
            <IconCalendar className="h-3.5 w-3.5" /> {date}
          </span>
        )}
        {profileLabel && (
          <span className="inline-flex items-center gap-1">
            <IconUser className="h-3.5 w-3.5" /> {profileLabel}
          </span>
        )}
        {job.currentPage ? (
          <span className="inline-flex items-center gap-1">
            <IconPage className="h-3.5 w-3.5" /> Page {job.currentPage}
          </span>
        ) : null}
      </div>

      {/* url */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={url}
          className="inline-flex items-center gap-1.5 truncate text-xs text-brand hover:underline"
        >
          <IconLink className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{url}</span>
        </a>
      )}

      {/* leads on its own line, coloured number */}
      <div className="flex items-center gap-1.5 text-sm text-muted">
        <IconUsers className="h-4 w-4 text-emerald-500" />
        <span className="text-base font-extrabold text-emerald-600">
          {(job.totalLeads || 0).toLocaleString()}
        </span>
        leads
      </div>

      {/* progress only while running */}
      {scrapeRun && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: pct + '%' }} />
        </div>
      )}

      {/* actions pinned to the bottom */}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {scrapeIdle && (
          <Btn
            onClick={run}
            disabled={anotherRunning}
            tint="#4f7cf5"
            title={anotherRunning ? 'You already have a job running. Stop it first.' : 'Start scraping'}
          >
            <IconPlay className="h-3.5 w-3.5" /> Run
          </Btn>
        )}
        {scrapeRun && (
          <Btn onClick={stop} tint="#d97706" title="Stop scraping">
            <IconStop className="h-3.5 w-3.5" /> Stop
          </Btn>
        )}
        <Btn onClick={() => dl('csv')} tint="#059669" title="Download CSV">
          <IconDownload className="h-3.5 w-3.5" /> CSV
        </Btn>
        <Btn onClick={() => dl('xlsx')} tint="#7c3aed" title="Download XLSX">
          <IconDownload className="h-3.5 w-3.5" /> XLSX
        </Btn>
        {!uiConfig.hideLogs && (
          <Btn onClick={() => onOpenLogs(job)} tint="#0891b2" title="View logs">
            <IconLogs className="h-3.5 w-3.5" /> Logs
          </Btn>
        )}
        <Btn onClick={remove} tint="#e11d48" title="Delete job">
          <IconTrash className="h-3.5 w-3.5" /> Del
        </Btn>
      </div>
    </div>
  )
}
