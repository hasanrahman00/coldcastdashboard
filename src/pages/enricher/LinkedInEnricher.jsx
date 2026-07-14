import { useState, useEffect, useMemo, useRef } from 'react'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import Modal from '../../components/Modal.jsx'
import EnricherJobCard from './EnricherJobCard.jsx'
import ScraperConnection from '../../components/ScraperConnection.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { IconUpload, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 × 3 — matches the Sales Nav / Apollo grid

// LinkedIn URL Enricher tab. Runs on its OWN server (separate VPS), so this tab owns
// its data: it lists jobs from the enricher backend (4s poll — the enricher's SSE is
// per-job, so a poll drives the grid) and owns the upload + pause/resume/cancel flow.
// The upload area is shown INLINE by default (like the Waterfall enricher) — no modal.
export default function LinkedInEnricher() {
  const toast = useToast()
  const configured = api.enricherConfigured()
  const { scraperConnected, onlineProfileId, credits } = useApp()
  const connected = scraperConnected('enricher')

  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState(0)
  const [logsJob, setLogsJob] = useState(null)

  // Upload state
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!configured) return
    let alive = true
    const load = async () => {
      try {
        const list = await api.enricherJobs()
        if (alive) setJobs(Array.isArray(list) ? list : [])
      } catch {
        /* surfaced via the empty state */
      }
    }
    load()
    const poll = setInterval(load, 4000)
    return () => {
      alive = false
      clearInterval(poll)
    }
  }, [configured])

  const sorted = useMemo(() => [...jobs].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)), [jobs])
  const pages = Math.max(1, Math.ceil(sorted.length / JOBS_PER_PAGE))
  const safePage = Math.min(page, pages - 1)
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1)
  }, [page, pages])
  const slice = sorted.slice(safePage * JOBS_PER_PAGE, safePage * JOBS_PER_PAGE + JOBS_PER_PAGE)

  const goPage = (delta) => {
    setPage((p) => Math.min(Math.max(0, p + delta), pages - 1))
    const cnt = document.querySelector('.cnt')
    if (cnt) cnt.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // The enricher worker runs one job at a time — disable Resume on other jobs while one runs.
  const anyRunning = jobs.some((j) => j.status === 'running' || j.status === 'queued')

  const act = async (fn, id) => {
    try {
      await fn(id)
    } catch (e) {
      toast(e.message || 'Action failed', 'err')
    }
  }
  const pause = (id) => act(api.enricherPause, id)
  const resume = (id) => act(api.enricherResume, id)
  const stop = (id) => act(api.enricherCancel, id)
  const remove = async (job) => {
    const running = job.status === 'running' || job.status === 'queued'
    const msg = running
      ? 'This job is still running. Delete it now? It will be stopped and all its data removed.'
      : 'Delete this job and all its data?'
    if (!window.confirm(msg)) return
    try {
      await api.enricherDelete(job.id)
      setJobs((p) => p.filter((j) => j.id !== job.id))
    } catch (e) {
      toast(e.message || 'Delete failed', 'err')
    }
  }
  const refresh = () => api.enricherJobs().then((l) => setJobs(Array.isArray(l) ? l : [])).catch(() => {})

  // ── Upload flow (inline, no modal) ─────────────────────────────────────────
  const pick = (f) => { if (f) setFile(f) }
  const onDrop = (e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }
  const clear = () => { setFile(null); if (inputRef.current) inputRef.current.value = '' }
  const run = async () => {
    if (!file) return toast('Choose a CSV to upload', 'err')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('provider', 'auto') // merge every logged-in source (best coverage)
      if (onlineProfileId) fd.append('profileId', onlineProfileId)
      const r = await api.enricherUpload(fd)
      toast(`Job started — ${r.total || 0} URLs`, 'ok')
      clear()
      refresh()
    } catch (e) {
      toast(e.message || 'Upload failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  if (!configured) {
    return (
      <div className="jg" style={{ marginTop: 20 }}>
        <div className="empty">
          <div className="empty-ic">🔗</div>
          <h3>Enricher server not connected</h3>
          <p>
            Set <code>VITE_LINKEDIN_ENRICHER_URL</code> to your enricher server, then redeploy the dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="wf">
      <ScraperConnection scraper="enricher" name="LinkedIn enrichment" />

      {/* Inline upload area — shown by default (same pattern as the Waterfall enricher) */}
      <div className="wf-card">
        <h3 className="wf-card-t">Upload LinkedIn URLs</h3>
        <div className="wf-card-s">
          <b>Required:</b> a LinkedIn profile URL column (any column with <code>linkedin.com/in/…</code>).{' '}
          <b>Optional:</b> First Name, Last Name, Title, Company, Location — improve match accuracy. Each row is
          enriched in your connected browser via your Lusha / ContactOut / SalesQL sessions — 5 credits per enriched row.
        </div>

        <div
          className={'wf-drop' + (drag ? ' over' : '') + (file ? ' has' : '')}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <IconUpload />
          <span className="wf-drop-t">{file ? file.name : 'Choose a CSV file'}</span>
        </div>

        <button
          className="btn btn-s wf-btn"
          disabled={!file || busy || !connected}
          title={connected ? '' : 'Connect the Coldcast extension in this browser to run a job'}
          onClick={run}
        >
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
        {sorted.length === 0 ? (
          <div className="empty">No enrichment jobs yet — upload a file above to start.</div>
        ) : (
          slice.map((j) => (
            <EnricherJobCard
              key={j.id}
              job={j}
              anotherRunning={anyRunning && j.status !== 'running' && j.status !== 'queued'}
              onPause={() => pause(j.id)}
              onResume={() => resume(j.id)}
              onStop={() => stop(j.id)}
              onDelete={() => remove(j)}
              onOpenLogs={() => setLogsJob(j)}
              downloadUrl={api.enricherDownloadUrl(j.id)}
            />
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="jpag">
          <button className="btn btn-g btn-sm" disabled={safePage <= 0} onClick={() => goPage(-1)}>
            <IconChevronLeft />
            Previous
          </button>
          <span className="jpag-info">
            Page {safePage + 1} of {pages}
          </span>
          <button className="btn btn-g btn-sm" disabled={safePage >= pages - 1} onClick={() => goPage(1)}>
            Next
            <IconChevronRight />
          </button>
        </div>
      )}

      <EnricherLogsModal job={logsJob} onClose={() => setLogsJob(null)} />
    </div>
  )
}

function EnricherLogsModal({ job, onClose }) {
  const [logs, setLogs] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!job) return
    let alive = true
    const load = async () => {
      try {
        const t = await api.enricherLogsText(job.id)
        if (alive) setLogs(t || '')
      } catch {}
    }
    load()
    const t = setInterval(load, 2000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [job])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(logs || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <Modal open={!!job} onClose={onClose} title={`📜 Logs — ${job?.filename || ''}`}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-s" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={copy} disabled={!logs}>
          {copied ? '✓ Copied' : '📋 Copy logs'}
        </button>
      </div>
      <div
        style={{
          maxHeight: '55vh',
          overflow: 'auto',
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', Menlo, Consolas, 'Liberation Mono', monospace",
          fontSize: 12.5,
          lineHeight: 1.5,
          letterSpacing: 0.1,
          color: 'var(--text)',
        }}
      >
        {logs
          ? logs.split('\n').map((line, i) => (
              <div key={i} style={{ marginBottom: 9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {line}
              </div>
            ))
          : <div style={{ color: 'var(--text-faint)' }}>No logs yet.</div>}
      </div>
    </Modal>
  )
}
