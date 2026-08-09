// ─────────────────────────────────────────────────────────────────────────────
//  VerifyEmail — the standalone email-verifier dashboard (Verify Email tab).
//  Upload a CSV/XLSX of emails → POST to Core /api/verify/start → live progress
//  (checked / total) → download the per-email result (Valid / Catch-all / Invalid /
//  Unknown). Billing is per email checked; the engine halts at the credit budget.
//  Mirrors the Waterfall enricher's upload → poll → download lifecycle + styles.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState, useMemo, useEffect } from 'react'
import { useApp, VERIFY_ACTIVE } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { IconUpload, IconMailCheck, IconDownload, IconTrash, IconWarn, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB
const JOBS_PER_PAGE = 9 // 3 cols × 3 rows — same grid as the other dashboards

const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

const n = (v) => (v || 0).toLocaleString()

// One row in the jobs list — mirrors the lifecycle: running → done (download) → error.
function VerifyJob({ job, verifyDownloadUrl, onRemove }) {
  const status = (job.status || 'queued').toLowerCase()
  const active = VERIFY_ACTIVE.includes(status)
  const preparing = status === 'queued' || status === 'uploading'
  const sc = job.statusCounts || {}
  const total = job.total ?? 0
  const done = job.done ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : active ? 6 : 0
  const hardFail = status === 'error' || status === 'failed'
  const finished = !active && !hardFail && !!job.verifyJobId
  const valid = sc.valid || 0
  const catchAll = sc.catch_all || 0
  const invalid = (sc.invalid || 0) + (sc.invalid_syntax || 0)
  const unknown = sc.unknown || 0
  const dl = (fmt) => window.open(verifyDownloadUrl(job.verifyJobId, fmt), '_blank')

  return (
    <div className={'wf-job' + (active ? ' running' : hardFail ? ' err' : finished ? ' done' : '')}>
      <div className="wf-job-h">
        <span className="wf-job-file" title={job.fileName}>{job.fileName || 'upload.csv'}</span>
        <span className="wf-job-d">{fmtDate(job.createdAt)}</span>
      </div>

      {active && (
        <>
          <div className="wf-job-s">
            <span className="enrich-dot" aria-hidden />
            {preparing ? (
              <span>Starting verification…</span>
            ) : (
              <>
                <span>Verifying</span>
                <b>{n(done)}</b>
                <span className="muted">/ {n(total)} checked</span>
              </>
            )}
          </div>
          <div className="jc-p"><div className="jc-pb" style={{ width: pct + '%' }} /></div>
        </>
      )}

      {finished && (
        <>
          <div className="wf-result">
            <IconMailCheck />
            <span className="wf-result-n">{n(valid)}</span>
            <span className="wf-result-l">valid email{valid === 1 ? '' : 's'}</span>
          </div>
          <div className="wf-result-sub">
            {n(done)} checked · {n(catchAll)} catch-all · {n(invalid)} invalid · {n(unknown)} unknown
          </div>
        </>
      )}

      {hardFail && (
        <div className="wf-job-s serr"><IconWarn /> {job.error || 'Verification failed'}</div>
      )}

      <div className="wf-acts">
        {finished && job.hasResults && (
          <>
            <button className="btn btn-csv wf-dlb" onClick={() => dl('csv')}><IconDownload /> Download CSV</button>
            <button className="btn btn-xlsx wf-dlb" onClick={() => dl('xlsx')}><IconDownload /> XLSX</button>
          </>
        )}
        <button
          className="wf-x"
          title="Delete verification"
          onClick={() => {
            if (window.confirm("Delete this verification and its result? You won't be able to download it again.")) {
              onRemove(job.verifyJobId)
            }
          }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

export default function VerifyEmail() {
  const { verifyUploads, startVerify, verifyDownloadUrl, removeVerifyUpload, credits, expired } = useApp()
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
      await startVerify(file)
      clear()
    } catch (e) {
      toast(e.message || 'Could not start verification', 'err')
    } finally {
      setBusy(false)
    }
  }

  const jobs = useMemo(
    () => Object.values(verifyUploads || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [verifyUploads],
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
        <h3 className="wf-card-t">Upload a CSV or XLSX of emails</h3>
        <div className="wf-card-s">Supports up to <b>10k emails</b>. Any column of email addresses works — we detect and de-duplicate them automatically. <b>0.5 credits per email checked</b>, stops when your credits run out.</div>

        {expired && (
          <div className="conn-status warn" role="status" style={{ marginTop: 10 }}>
            <span className="conn-dot" />
            <span>Your Coldcast account has <strong>expired</strong> — renew to run verifications. You can still download past results.</span>
          </div>
        )}

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

        <button className="btn btn-s wf-btn" disabled={!file || busy || expired} title={expired ? 'Account expired — renew to run verifications' : ''} onClick={run}>
          {busy ? 'Starting…' : 'Upload and verify'}
        </button>

        <div className="wf-card-foot">
          <span>{(credits ?? 0).toLocaleString()} credits left</span>
          {file && !busy && <button className="wf-clear" onClick={clear}>Clear</button>}
        </div>
      </div>

      <div className="jg-head">
        <h3>Verification Jobs</h3>
        <span className="count">{jobs.length ? `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}` : ''}</span>
      </div>

      <div className="jg">
        {jobs.length === 0 ? (
          <div className="empty">No verification jobs yet — upload a file above to start.</div>
        ) : (
          slice.map((j) => (
            <VerifyJob key={j.verifyJobId} job={j} verifyDownloadUrl={verifyDownloadUrl} onRemove={removeVerifyUpload} />
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
