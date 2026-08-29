import {
  IconCalendar,
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

// Same visual language as the Sales Nav JobCard (reuses the .jc* CSS), but fully
// props-driven — the Apollo tab owns its own data + actions (its own server), so
// this card has no store coupling. Apollo counts leads in `totalScraped`, is
// CSV-only, and has no profile label (profiles arrive with the bridge).
export default function ApolloJobCard({ job, anotherRunning, onRun, onStop, onDelete, onOpenLogs, downloadUrl }) {
  const scrapeIdle = ['idle', 'stopped', 'done', 'failed'].includes(job.status)
  const scrapeRun = job.status === 'running'
  const scrapeBusy = scrapeRun || job.status === 'stopping'
  const leads = job.totalScraped ?? job.totalLeads ?? 0
  const hasData = job.hasData || leads > 0
  const url = job.url || ''
  const d = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

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

  const runTitle = anotherRunning ? 'You already have a job running. Stop it first.' : 'Start scraping'
  const pct = job.progress || 0
  // Auto-download the CSV: click a hidden anchor so the browser downloads it straight away
  // (the server sends Content-Disposition: attachment) instead of popping a blank tab. The
  // filename comes from that header (the download attr is ignored cross-origin, but harmless).
  const dl = () => {
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

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
        <span className="n">{Number(leads).toLocaleString()}</span> leads
      </div>

      {scrapeRun && (
        <div className="jc-p">
          <div className="jc-pb" style={{ width: pct + '%' }} />
        </div>
      )}

      <div className="jc-a">
        {scrapeIdle && (
          <button className="btn btn-s btn-sm" disabled={anotherRunning} title={runTitle} onClick={onRun}>
            <IconPlay /> Run
          </button>
        )}
        {scrapeRun && (
          <button className="btn btn-w btn-sm" onClick={onStop}>
            <IconStop /> Stop
          </button>
        )}
        <button className="btn btn-csv btn-sm" onClick={dl}>
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
