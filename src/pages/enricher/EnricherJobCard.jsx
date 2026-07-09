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
} from '../../lib/icons.jsx'

// LinkedIn URL Enricher job card — same visual language as the Apollo / Sales Nav
// cards (reuses the .jc* CSS), fully props-driven (its own server owns the data).
// The enricher creates jobs by CSV upload, streams done/total, and supports
// pause / resume / cancel; "enriched" = rows with a resolved contact.
export default function EnricherJobCard({ job, anotherRunning, onPause, onResume, onStop, onDelete, onOpenLogs, downloadUrl }) {
  const st = job.status
  const running = st === 'running' || st === 'queued'
  const paused = st === 'paused' || st === 'interrupted'
  const enriched = (job.full || 0) + (job.partial || 0)
  const hasData = enriched > 0 || (job.done || 0) > 0
  const total = job.total || 0
  const done = job.done || 0
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0
  const d = job.startedAt
    ? new Date(job.startedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  let stCls = 'idle'
  let stTxt = 'Ready'
  let StIcon = IconRetry
  if (running) {
    stCls = 'run'
    stTxt = st === 'queued' ? 'Queued…' : 'Enriching…'
  } else if (paused) {
    stCls = 'idle'
    stTxt = st === 'interrupted' ? 'Interrupted — resume' : 'Paused'
  } else if (st === 'done') {
    stCls = 'ok'
    stTxt = 'Done'
  } else if (st === 'cancelled') {
    stCls = 'idle'
    stTxt = 'Cancelled'
  } else if (st === 'failed') {
    stCls = 'bad'
    stTxt = 'Failed'
    StIcon = IconWarn
  }

  const resumeTitle = anotherRunning ? 'Another job is running. Wait for it to finish.' : 'Resume enriching'
  const dl = () => window.open(downloadUrl, '_blank')

  return (
    <div className={'jc jc-' + stCls}>
      <div className="jc-h">
        <div className="jc-t">{job.filename || 'Untitled'}</div>
      </div>

      <div className={'jc-st ' + stCls}>
        <StIcon /> {stTxt}
      </div>

      <div className="jc-m">
        <span>
          <IconCalendar /> {d}
        </span>
        <span>
          <IconFileLines /> {done}/{total}
        </span>
      </div>

      <div className="jc-leads">
        <IconUsersSm />
        <span className="n">{Number(enriched).toLocaleString()}</span> enriched
        {job.issues ? <span style={{ color: 'var(--text-faint)', marginLeft: 8 }}>· {job.issues} issues</span> : null}
      </div>

      {running && (
        <div className="jc-p">
          <div className="jc-pb" style={{ width: pct + '%' }} />
        </div>
      )}

      <div className="jc-a">
        {running && (
          <>
            <button className="btn btn-w btn-sm" onClick={onPause}>
              Pause
            </button>
            <button className="btn btn-w btn-sm" onClick={onStop}>
              <IconStop /> Stop
            </button>
          </>
        )}
        {paused && (
          <button className="btn btn-s btn-sm" disabled={anotherRunning} title={resumeTitle} onClick={onResume}>
            <IconPlay /> Resume
          </button>
        )}
        <button className="btn btn-csv btn-sm" disabled={!hasData} onClick={dl}>
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
