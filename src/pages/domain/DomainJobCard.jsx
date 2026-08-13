import {
  IconCalendar, IconUsersSm, IconPlay, IconStop, IconDownload, IconLogsLines, IconTrash, IconRetry, IconWarn,
} from '../../lib/icons.jsx'

// Reuses the shared .jc* card CSS. Domain enrichment → firmographics + contacts; CSV export.
export default function DomainJobCard({ job, anotherRunning, onRun, onStop, onDelete, onOpenLogs, downloadUrl }) {
  const scrapeBusy = job.status === 'running' || job.status === 'queued'
  const scrapeIdle = !scrapeBusy
  const c = job.counts || {}
  const contacts = c.contacts ?? 0
  const domains = c.domains ?? 0
  const total = c.total ?? 0
  const hasData = total > 0 || job.hasCsv
  const d = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  let stCls = 'idle', stTxt = 'Ready to run', StIcon = IconRetry
  if (scrapeBusy) { stCls = 'run'; stTxt = job.status === 'queued' ? 'Queued…' : 'Enriching…' }
  else if (job.status === 'error') { stCls = 'bad'; stTxt = job.error ? `Failed — ${job.error}` : 'Failed'; StIcon = IconWarn }
  else if (job.status === 'stopped') { stCls = 'idle'; stTxt = 'Stopped' }
  else if (hasData) { stCls = 'ok'; stTxt = 'File available' }

  const runTitle = anotherRunning ? 'You already have a job running. Stop it first.' : 'Start enriching'

  return (
    <div className={'jc jc-' + stCls}>
      <div className="jc-h"><div className="jc-t">{job.name || 'Untitled'}</div></div>
      <div className={'jc-st ' + stCls}><StIcon /> {stTxt}</div>
      <div className="jc-m"><span><IconCalendar /> {d}</span></div>
      {job.summary && <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 4px' }}>{job.summary}</div>}
      <div className="jc-leads">
        <IconUsersSm />
        <span className="n">{Number(contacts).toLocaleString()}</span> contacts
        {domains > 0 && <span style={{ color: 'var(--text-faint)', marginLeft: 8 }}>· {Number(domains).toLocaleString()} domains</span>}
      </div>

      <div className="jc-a">
        {scrapeIdle && (
          <button className="btn btn-s btn-sm" disabled={anotherRunning} title={runTitle} onClick={onRun}><IconPlay /> Run</button>
        )}
        {scrapeBusy && (
          <button className="btn btn-w btn-sm" onClick={onStop}><IconStop /> Stop</button>
        )}
        <button className="btn btn-csv btn-sm" onClick={() => window.open(downloadUrl, '_blank')} disabled={!hasData}><IconDownload /> CSV</button>
        <button className="btn btn-logs btn-sm" onClick={onOpenLogs}><IconLogsLines /> Logs</button>
        <button className="btn btn-d btn-sm jc-del" title="Delete job" aria-label="Delete job" onClick={onDelete}><IconTrash /></button>
      </div>
    </div>
  )
}
