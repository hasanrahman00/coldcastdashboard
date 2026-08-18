import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import {
  IconCalendar,
  IconUser,
  IconUsersSm,
  IconFileLines,
  IconPlay,
  IconStop,
  IconDownload,
  IconLogsLines,
  IconTrash,
  IconRetry,
  IconWarn,
  IconLink,
} from '../../lib/icons.jsx'

function jobUrlOf(j) {
  let url = ''
  if (Array.isArray(j.urls) && j.urls.length) {
    const u = j.urls[0]
    url = typeof u === 'string' ? u : (u && (u.url || u.href)) || ''
  }
  return url || j.url || j.searchUrl || ''
}

export default function JobCard({ job, onOpenLogs }) {
  const { jobs, profiles, activeProfileId, uiConfig, startJob, stopJob, deleteJob, downloadUrl, expired, busyJob } = useApp()
  const toast = useToast()

  const scrapeIdle = ['idle', 'stopped', 'done', 'failed'].includes(job.status)
  const scrapeRun = job.status === 'running'
  const scrapeBusy = scrapeRun || job.status === 'stopping'
  const hasData = job.hasData || job.totalLeads > 0

  // One job at a time across ALL scrapers (not just this one).
  const anotherRunning = !!busyJob && busyJob.id !== job.id
  const runTitle = anotherRunning ? `You already have a job running (${busyJob.scraper}). Stop it before starting another.` : 'Start scraping'

  const profile = profiles.find((p) => p.id === (job.profileId || activeProfileId))
  const profileLabel = profile ? profile.name || profile.id : job.profileId ? 'Unknown profile' : ''

  const url = jobUrlOf(job)
  const d = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // status line (TotLeads-style)
  let stCls = 'idle'
  let stTxt = 'Ready to run'
  let StIcon = IconRetry
  if (scrapeBusy) {
    stCls = 'run'
    stTxt = job.status === 'stopping' ? 'Stopping…' : 'Scraping…'
  } else if (hasData) {
    stCls = 'ok'
    stTxt = 'File available'
  } else if (job.status === 'failed') {
    stCls = 'bad'
    stTxt = 'Failed'
    StIcon = IconWarn
  }

  const wrap = (fn) => async () => {
    try {
      await fn()
    } catch (e) {
      toast(e.message || 'Action failed', 'err')
    }
  }
  const run = async () => {
    try {
      await startJob(job.id)
    } catch (e) {
      const m = e.message || 'Action failed'
      // The connect / API-key reasons (🔑 / 🧩) are written into the job log by the
      // scraper — open the Logs so the user sees the reason there (persistent), instead
      // of only a fleeting toast. Everything else still toasts.
      if (/🔑|🧩/.test(m)) onOpenLogs(job)
      else toast(m, 'err')
    }
  }
  const stop = wrap(() => stopJob(job.id))
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
    <div className={'jc jc-' + stCls}>
      <div className="jc-h">
        <div className="jc-t">{job.name || 'Untitled'}</div>
        {job.appendNext && (
          <span
            title="The next Run will append a new search into this list (existing leads kept, deduped)"
            style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#0e7490', background: 'rgba(8,145,178,.12)', padding: '2px 8px', borderRadius: 999 }}
          >
            Append pending
          </span>
        )}
      </div>

      <div className={'jc-st ' + stCls}>
        <StIcon /> {stTxt}
      </div>

      <div className="jc-m">
        <span>
          <IconCalendar /> {d}
        </span>
        {profileLabel && (
          <span>
            <IconUser /> {profileLabel}
          </span>
        )}
        {job.currentPage ? (
          <span>
            <IconFileLines /> Page {job.currentPage}
          </span>
        ) : null}
      </div>

      {url && (
        <a className="jc-url" href={url} target="_blank" rel="noopener noreferrer" title={url}>
          <IconLink />
          <span>{url}</span>
        </a>
      )}

      <div className="jc-leads">
        <IconUsersSm />
        <span className="n">{(job.totalLeads || 0).toLocaleString()}</span> leads
      </div>

      {scrapeRun && (
        <div className="jc-p">
          <div className="jc-pb" style={{ width: pct + '%' }} />
        </div>
      )}

      <div className="jc-a">
        {scrapeIdle && (
          <button className="btn btn-s btn-sm" disabled={anotherRunning || expired} title={expired ? 'Account expired — renew to run jobs' : runTitle} onClick={run}>
            <IconPlay /> Run
          </button>
        )}
        {scrapeRun && (
          <button className="btn btn-w btn-sm" onClick={stop}>
            <IconStop /> Stop
          </button>
        )}
        <button className="btn btn-csv btn-sm" onClick={() => dl('csv')}>
          <IconDownload /> CSV
        </button>
        {!uiConfig.hideLogs && (
          <button className="btn btn-logs btn-sm" onClick={() => onOpenLogs(job)}>
            <IconLogsLines /> Logs
          </button>
        )}
        <button className="btn btn-d btn-sm jc-del" title="Delete job" aria-label="Delete job" onClick={remove}>
          <IconTrash />
        </button>
      </div>
    </div>
  )
}
