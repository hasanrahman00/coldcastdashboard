import {
  IconCalendar,
  IconUsersSm,
  IconPlay,
  IconStop,
  IconDownload,
  IconLogsLines,
  IconTrash,
  IconRetry,
  IconWarn,
  IconLink,
} from '../../lib/icons.jsx'

// Reuses the shared .jc* card CSS. Props-driven — the Post tab owns its own data +
// actions (its own server). Counts are reactor / commenter / reposter profiles.
export default function PostJobCard({ job, anotherRunning, onRun, onStop, onDelete, onOpenLogs, downloadUrl }) {
  const scrapeBusy = job.status === 'running' || job.status === 'queued'
  const scrapeIdle = !scrapeBusy
  const c = job.counts || {}
  const total = c.total ?? 0
  const hasData = total > 0
  const url = job.postUrl || ''
  const d = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  let stCls = 'idle', stTxt = 'Ready to run', StIcon = IconRetry
  if (scrapeBusy) {
    stCls = 'run'
    stTxt = job.status === 'queued' ? 'Queued…' : 'Scraping…'
  } else if (job.status === 'error') {
    stCls = 'bad'; stTxt = job.error ? `Failed — ${job.error}` : 'Failed'; StIcon = IconWarn
  } else if (hasData) {
    stCls = 'ok'; stTxt = 'File available'
  }

  const runTitle = anotherRunning ? 'You already have a job running. Stop it first.' : 'Start scraping'
  const dl = () => window.open(downloadUrl, '_blank')

  return (
    <div className={'jc jc-' + stCls}>
      <div className="jc-h">
        <div className="jc-t">{job.name || 'Untitled'}</div>
      </div>

      <div className={'jc-st ' + stCls}>
        <StIcon /> {stTxt}
      </div>

      <div className="jc-m">
        <span><IconCalendar /> {d}</span>
      </div>

      {url && (
        <a className="jc-url" href={url} target="_blank" rel="noopener noreferrer" title={url}>
          <IconLink />
          <span>{url}</span>
        </a>
      )}

      <div className="jc-leads">
        <IconUsersSm />
        <span className="n">{Number(total).toLocaleString()}</span> profiles
      </div>

      {hasData && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 4px' }}>
          {Number(c.reactor || 0).toLocaleString()} reacted · {Number(c.commenter || 0).toLocaleString()} commented · {Number(c.reposter || 0).toLocaleString()} reposted
        </div>
      )}

      <div className="jc-a">
        {scrapeIdle && (
          <button className="btn btn-s btn-sm" disabled={anotherRunning} title={runTitle} onClick={onRun}>
            <IconPlay /> Run
          </button>
        )}
        {scrapeBusy && (
          <button className="btn btn-w btn-sm" onClick={onStop}>
            <IconStop /> Stop
          </button>
        )}
        <button className="btn btn-csv btn-sm" onClick={dl} disabled={!hasData}>
          <IconDownload /> CSV
        </button>
        <button className="btn btn-logs btn-sm" onClick={onOpenLogs}>
          <IconLogsLines /> Logs
        </button>
        <button className="btn btn-d btn-sm jc-del" title="Delete job" aria-label="Delete job" onClick={onDelete}>
          <IconTrash />
        </button>
      </div>
    </div>
  )
}
