import { useApp, ENRICH_ACTIVE } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import JobEnrich from './JobEnrich.jsx'
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
  IconMailCheck,
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
  const { jobs, profiles, activeProfileId, uiConfig, startJob, stopJob, deleteJob, downloadUrl, enrichByJob } = useApp()
  const toast = useToast()

  const scrapeIdle = ['idle', 'stopped', 'done', 'failed'].includes(job.status)
  const scrapeRun = job.status === 'running'
  const scrapeBusy = scrapeRun || job.status === 'stopping'
  const hasData = job.hasData || job.totalLeads > 0

  // Enrich is mutually exclusive with scraping THIS job: while enrich is in flight
  // the Run button is locked, and Enrich is locked while the scrape is busy.
  const enrichState = enrichByJob[job.id]
  const enriching = !!enrichState && ENRICH_ACTIVE.includes(enrichState.status)

  const anotherRunning = jobs.some(
    (x) => x.id !== job.id && (x.status === 'running' || x.status === 'stopping'),
  )
  const runTitle = enriching
    ? 'Enrichment is running — wait for it to finish.'
    : anotherRunning
      ? 'You already have a job running. Stop it first.'
      : 'Start scraping'

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
  const run = wrap(() => startJob(job.id))
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
    <div className="jc">
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

      <JobEnrich job={job} scrapeBusy={scrapeBusy} hasData={hasData} />

      {scrapeRun && (
        <div className="jc-p">
          <div className="jc-pb" style={{ width: pct + '%' }} />
        </div>
      )}

      <div className="jc-a">
        {scrapeIdle && (
          <button
            className={'btn btn-s btn-sm' + (enriching ? ' is-locked' : '')}
            disabled={anotherRunning || enriching}
            title={runTitle}
            onClick={run}
          >
            {enriching ? <><IconMailCheck /> Enriching…</> : <><IconPlay /> Run</>}
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
        <button className="btn btn-xlsx btn-sm" onClick={() => dl('xlsx')}>
          <IconDownload /> XLSX
        </button>
        {!uiConfig.hideLogs && (
          <button className="btn btn-logs btn-sm" onClick={() => onOpenLogs(job)}>
            <IconLogsLines /> Logs
          </button>
        )}
        <button className="btn btn-d btn-sm" title="Delete job" onClick={remove}>
          <IconTrash /> Del
        </button>
      </div>
    </div>
  )
}
