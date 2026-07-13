import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import Modal from '../../components/Modal.jsx'
import EnricherJobCard from './EnricherJobCard.jsx'
import EnricherNewJobModal from './EnricherNewJobModal.jsx'
import ScraperConnection from '../../components/ScraperConnection.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 × 3 — matches the Sales Nav / Apollo grid

// LinkedIn URL Enricher tab. Runs on its OWN server (separate VPS), so this tab owns
// its data: it lists jobs from the enricher backend (4s poll — the enricher's SSE is
// per-job, so a poll drives the grid) and owns the upload + pause/resume/cancel flow.
export default function LinkedInEnricher() {
  const toast = useToast()
  const configured = api.enricherConfigured()
  const { scraperConnected } = useApp()
  const connected = scraperConnected('enricher')

  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [logsJob, setLogsJob] = useState(null)

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
    <div>
      <ScraperConnection scraper="enricher" name="LinkedIn enrichment" />

      {/* Centered New Job — same sticky bar as the other tabs */}
      <div className="newjob-bar">
        <button
          className="btn btn-p"
          onClick={() => setShowNew(true)}
          disabled={!connected}
          title={connected ? '' : 'Connect the Coldcast extension in this browser to run a job here'}
        >
          <IconPlus />
          New Job
        </button>
      </div>

      <div className="jg-head">
        <h3>Active Jobs</h3>
        <span className="count">{jobs.length ? `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}` : ''}</span>
      </div>

      <div className="jg">
        {sorted.length === 0 ? (
          <div className="empty">
            <div className="empty-ic">🔗</div>
            <h3>No jobs yet</h3>
            <p>Upload a list of LinkedIn URLs to enrich them into a clean CSV</p>
            <button className="btn btn-p" onClick={() => setShowNew(true)}>
              <IconPlus />
              New Job
            </button>
          </div>
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

      <EnricherNewJobModal open={showNew} onClose={() => setShowNew(false)} onCreated={refresh} />
      <EnricherLogsModal job={logsJob} onClose={() => setLogsJob(null)} />
    </div>
  )
}

function EnricherLogsModal({ job, onClose }) {
  const [logs, setLogs] = useState('')
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

  return (
    <Modal open={!!job} onClose={onClose} title={`📜 Logs — ${job?.filename || ''}`}>
      <pre
        style={{
          maxHeight: '55vh',
          overflow: 'auto',
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 12,
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          color: 'var(--text)',
          margin: 0,
        }}
      >
        {logs || 'No logs yet.'}
      </pre>
    </Modal>
  )
}
