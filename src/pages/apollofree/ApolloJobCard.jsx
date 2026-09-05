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
  const scrapeIdle = ['idle', 'stopped', 'done', 'failed', 'blocked'].includes(job.status)
  const scrapeRun = job.status === 'running'
  const scrapeBusy = scrapeRun || job.status === 'stopping'
  // A resumable PAUSE (captcha / signed-out / restriction / rate-limit) surfaces as 'stopped' with
  // a persistent pauseMessage; a non-resumable BLOCK (search too large) surfaces as 'blocked'.
  const isPaused = !scrapeBusy && !!job.pauseMessage
  const isBlocked = job.status === 'blocked' || (!scrapeBusy && !!job.blockReason)
  const attentionMsg = (scrapeBusy && job.warning) || (isBlocked && job.blockReason) || (isPaused && job.pauseMessage) || ''
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
  } else if (isBlocked) {
    stCls = 'bad'
    stTxt = 'Search too large'
    StIcon = IconWarn
  } else if (isPaused) {
    stCls = 'bad'
    stTxt = 'Paused — action needed'
    StIcon = IconWarn
  } else if (hasData) {
    stCls = 'ok'
    stTxt = 'File available'
  } else if (job.status === 'failed') {
    stCls = 'bad'
    stTxt = 'Failed'
    StIcon = IconWarn
  }

  // A paused (resumable) job re-starts EXACTLY where it left off → "Re-run"; a blocked one needs
  // the user to narrow the search first, so no resume framing.
  const runLabel = isPaused || (job.status === 'stopped' && job.currentPage > 0) ? 'Re-run' : 'Run'
  const runTitle = anotherRunning
    ? 'You already have a job running. Stop it first.'
    : isPaused ? 'Re-run — resumes exactly where it paused (already-collected leads are skipped)'
    : 'Start scraping'
  const pct = job.progress || 0
  // Auto-download the CSV straight to the Downloads folder — no "Save as" popup.
  // The CSV lives on the scraper's own origin, so a plain <a href> is a CROSS-ORIGIN
  // download: the browser ignores the download attr and prompts a save dialog. Instead
  // we fetch the bytes (CORS is `*`, auth is a query-string token — no headers needed)
  // and download from a same-origin blob: URL, where the download attr IS honored.
  const dl = async () => {
    const fallbackName = ((job.name || 'apollo-leads').replace(/[^a-zA-Z0-9_-]/g, '_')) + '.csv'
    try {
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const blob = await res.blob()
      // Use the server's filename when it's exposed (Content-Disposition), else the job name.
      let filename = fallbackName
      const cd = res.headers.get('Content-Disposition') || ''
      const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
      if (m) { try { filename = decodeURIComponent(m[1]) } catch { filename = m[1] } }
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(objUrl), 4000)
    } catch {
      // Network/CORS fallback: direct nav (may show a save prompt, but still downloads).
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = ''
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
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
        <StIcon /> {job.warning && scrapeBusy ? 'Needs your attention' : stTxt}
      </div>

      {attentionMsg && (
        <div
          className="jc-warn"
          title={attentionMsg}
          style={{
            display: 'flex', gap: 6, alignItems: 'flex-start',
            fontSize: 12, lineHeight: 1.35, fontWeight: 600,
            color: '#92400e', background: 'rgba(245,158,11,.12)',
            border: '1px solid rgba(245,158,11,.35)', borderRadius: 8,
            padding: '8px 10px', margin: '2px 0',
          }}
        >
          <IconWarn />
          <span>{attentionMsg}</span>
        </div>
      )}

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
            <IconPlay /> {runLabel}
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
