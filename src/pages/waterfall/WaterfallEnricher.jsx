// ─────────────────────────────────────────────────────────────────────────────
//  WaterfallEnricher — the standalone email-enricher dashboard (Waterfall tab).
//  Upload a CSV/XLSX → POST to the SAME Core /api/enrich/start endpoint → live
//  progress (count + credits) → download the verified-email result. No scrape job,
//  no merge: the engine halts at the credit budget, so credits charged == valids.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState } from 'react'
import { useApp, ENRICH_ACTIVE } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { IconUpload, IconMailCheck, IconDownload, IconTrash, IconWarn } from '../../lib/icons.jsx'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

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
  const dl = (fmt) => window.open(enrichDownloadUrl(job.enrichJobId, 'valid', fmt), '_blank')

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
  const inputRef = useRef(null)

  const pick = (f) => {
    if (!f) return
    if (f.size > MAX_BYTES) { toast('That file is over 10MB — please split it into smaller batches.', 'err'); return }
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

  const jobs = Object.values(enrichUploads || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return (
    <div className="wf">
      <div className="wf-card">
        <h3 className="wf-card-t">Upload a CSV</h3>
        <div className="wf-card-s">Max: 5000 rows · 10MB. Name + company/website → verified emails — 1 credit per valid email, stops when your credits run out.</div>

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

      <div className="wf-jobs">
        {jobs.length === 0 ? (
          <div className="empty">No enrichment jobs yet — upload a file to start.</div>
        ) : (
          jobs.map((j) => (
            <UploadJob key={j.enrichJobId} job={j} enrichDownloadUrl={enrichDownloadUrl} onRemove={removeEnrichUpload} />
          ))
        )}
      </div>
    </div>
  )
}
