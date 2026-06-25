// ─────────────────────────────────────────────────────────────────────────────
//  WaterfallEnricher — the standalone email-enricher dashboard (Waterfall tab).
//  Upload a CSV/XLSX → POST to the SAME Core /api/enrich/start endpoint → live
//  progress (count + credits) → download the verified-email result. No scrape job,
//  no merge: the engine halts at the credit budget, so credits charged == valids.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState, useMemo, useEffect } from 'react'
import { useApp, ENRICH_ACTIVE } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { IconUpload, IconMailCheck, IconDownload, IconTrash, IconWarn, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB — comfortably fits ~10k rows
const JOBS_PER_PAGE = 9 // 3 cols × 3 rows — same grid as the Sales Nav dashboard

const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

// One row in the jobs list — mirrors the lifecycle: running → done (download) → error.
function UploadJob({ job, enrichDownloadUrl, onRemove }) {
  const status = job.status || 'queued'
  const active = ENRICH_ACTIVE.includes(status)
  const done = status === 'done' || status === 'completed' || (['stopped', 'paused'].includes(status) && (job.done || 0) > 0)
  const errored = status === 'error' || status === 'failed' || status === 'cancelled'
  const preparing = status === 'queued' || status === 'uploading'
  const valid = job.valid ?? 0
  const used = job.creditsUsed ?? 0
  const total = job.total ?? 0
  const processed = job.done ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : active ? 6 : 0
  // 'all' = the ORIGINAL uploaded rows preserved (none deleted) with Email/Status/Source
  // appended — rows without a valid email keep their row, just with an empty Email.
  const dl = (fmt) => window.open(enrichDownloadUrl(job.enrichJobId, 'all', fmt), '_blank')

  return (
    <div className={'wf-job' + (active ? ' running' : done ? ' done' : errored ? ' err' : '')}>
      <div className="wf-job-h">
        <span className="wf-job-file" title={job.fileName}>{job.fileName || 'upload.csv'}</span>
        <span className="wf-job-d">{fmtDate(job.createdAt)}</span>
        <button className="wf-x" title="Remove from list" onClick={() => onRemove(job.enrichJobId)}>
          <IconTrash />
        </button>
      </div>

      {active && (
        <>
          <div className="wf-job-s">
            <span className="enrich-dot" aria-hidden />
            {preparing ? (
              <span>Starting enrichment…</span>
            ) : (
              <>
                <span>Enriching</span>
                <b>{valid.toLocaleString()}</b>
                <span className="muted">
                  verified · {processed.toLocaleString()}/{total.toLocaleString()} scanned · {used.toLocaleString()} credit{used === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>
          <div className="jc-p"><div className="jc-pb" style={{ width: pct + '%' }} /></div>
        </>
      )}

      {done && (
        <>
          <div className="wf-job-s sok">
            <IconMailCheck /> <b>{valid.toLocaleString()}</b> verified email{valid === 1 ? '' : 's'} · {used.toLocaleString()} credit{used === 1 ? '' : 's'} used{job.haltReason ? ` · ${job.haltReason}` : ''}
          </div>
          <div className="wf-dl">
            <button className="btn btn-csv btn-sm" onClick={() => dl('csv')}><IconDownload /> CSV</button>
            <button className="btn btn-xlsx btn-sm" onClick={() => dl('xlsx')}><IconDownload /> XLSX</button>
          </div>
        </>
      )}

      {errored && (
        <div className="wf-job-s serr"><IconWarn /> {job.error || 'Enrichment failed'}</div>
      )}
    </div>
  )
}

export default function WaterfallEnricher() {
  const { enrichUploads, startEnrich, enrichDownloadUrl, removeEnrichUpload, credits } = useApp()
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [page, setPage] = useState(0)
  const inputRef = useRef(null)

  const pick = (f) => {
    if (!f) return
    if (f.size > MAX_BYTES) { toast('That file is too large — please split it into smaller batches (~10k rows max).', 'err'); return }
    setFile(f)
  }
  const clear = () => { setFile(null); if (inputRef.current) inputRef.current.value = '' }
  const onDrop = (e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }

  const run = async () => {
    if (!file || busy) return
    setBusy(true)
    try {
      await startEnrich(file)
      clear()
    } catch (e) {
      toast(e.message || 'Could not start enrichment', 'err')
    } finally {
      setBusy(false)
    }
  }

  const jobs = useMemo(
    () => Object.values(enrichUploads || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [enrichUploads],
  )
  const pages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE))
  const safePage = Math.min(page, pages - 1)
  useEffect(() => { if (page > pages - 1) setPage(pages - 1) }, [page, pages])
  const slice = jobs.slice(safePage * JOBS_PER_PAGE, safePage * JOBS_PER_PAGE + JOBS_PER_PAGE)
  const goPage = (delta) => {
    setPage((p) => Math.min(Math.max(0, p + delta), pages - 1))
    const cnt = document.querySelector('.cnt')
    if (cnt) cnt.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="wf">
      <div className="wf-card">
        <h3 className="wf-card-t">Upload a CSV</h3>
        <div className="wf-card-s">Supports up to <b>10k rows</b>. Required headers: <b>First Name</b>, <b>Last Name</b>, <b>Website</b> — and it waterfalls through <b>Website_one</b>, <b>Website_two</b> if present. 1 credit per valid email, stops when your credits run out.</div>

        <div
          className={'wf-drop' + (drag ? ' over' : '') + (file ? ' has' : '')}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <IconUpload />
          <span className="wf-drop-t">{file ? file.name : 'Choose a CSV file'}</span>
        </div>

        <button className="btn btn-s wf-btn" disabled={!file || busy} onClick={run}>
          {busy ? 'Starting…' : 'Upload and enrich'}
        </button>

        <div className="wf-card-foot">
          <span>{(credits ?? 0).toLocaleString()} credits left</span>
          {file && !busy && <button className="wf-clear" onClick={clear}>Clear</button>}
        </div>
      </div>

      <div className="jg-head">
        <h3>Enrichment Jobs</h3>
        <span className="count">{jobs.length ? `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}` : ''}</span>
      </div>

      <div className="jg">
        {jobs.length === 0 ? (
          <div className="empty">No enrichment jobs yet — upload a file above to start.</div>
        ) : (
          slice.map((j) => (
            <UploadJob key={j.enrichJobId} job={j} enrichDownloadUrl={enrichDownloadUrl} onRemove={removeEnrichUpload} />
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="jpag">
          <button className="btn btn-g btn-sm" disabled={safePage <= 0} onClick={() => goPage(-1)}>
            <IconChevronLeft /> Previous
          </button>
          <span className="jpag-info">Page {safePage + 1} of {pages}</span>
          <button className="btn btn-g btn-sm" disabled={safePage >= pages - 1} onClick={() => goPage(1)}>
            Next <IconChevronRight />
          </button>
        </div>
      )}
    </div>
  )
}
