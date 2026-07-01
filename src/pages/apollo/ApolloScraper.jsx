import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { api } from '../../lib/api.js'
import { useToast } from '../../store/ToastProvider.jsx'
import Modal from '../../components/Modal.jsx'
import ApolloJobCard from './ApolloJobCard.jsx'
import ApolloNewJobModal from './ApolloNewJobModal.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 cols × 3 rows — matches the Sales Nav grid

// Apollo runs on its OWN server, so this tab owns its data end-to-end: it lists +
// live-streams jobs straight from the Apollo backend (SSE, with a polling fallback)
// rather than the shared AppStore (which is wired to the Sales Nav server).
export default function ApolloScraper() {
  const toast = useToast()
  const configured = api.apolloConfigured()

  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [logsJob, setLogsJob] = useState(null)
  const esRef = useRef(null)

  const upsert = useCallback((job) => {
    if (!job || !job.id) return
    setJobs((prev) => {
      const i = prev.findIndex((j) => j.id === job.id)
      if (i === -1) return [job, ...prev]
      const next = prev.slice()
      next[i] = job
      return next
    })
  }, [])

  useEffect(() => {
    if (!configured) return
    let alive = true
    const load = async () => {
      try {
        const list = await api.apolloJobs()
        if (alive) setJobs(Array.isArray(list) ? list : [])
      } catch {
        /* surfaced via the empty state */
      }
    }
    load()

    // Live updates from the Apollo server. If SSE never connects the 5s poll covers it.
    try {
      const es = api.apolloEvents()
      esRef.current = es
      es.addEventListener('init', (e) => {
        try {
          const d = JSON.parse(e.data)
          if (alive) setJobs(Array.isArray(d) ? d : [])
        } catch {}
      })
      es.addEventListener('job:update', (e) => {
        try {
          upsert(JSON.parse(e.data))
        } catch {}
      })
      es.addEventListener('job:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data)
          setJobs((p) => p.filter((j) => j.id !== id))
        } catch {}
      })
    } catch {
      /* EventSource unavailable → poll only */
    }
    const poll = setInterval(load, 5000)

    return () => {
      alive = false
      clearInterval(poll)
      try {
        esRef.current?.close()
      } catch {}
    }
  }, [configured, upsert])

  const sorted = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [jobs],
  )
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

  const run = async (id) => {
    try {
      await api.apolloStart(id)
    } catch (e) {
      toast(e.message || 'Could not start', 'err')
    }
  }
  const stop = async (id) => {
    try {
      await api.apolloStop(id)
    } catch (e) {
      toast(e.message || 'Could not stop', 'err')
    }
  }
  const remove = async (job) => {
    const running = job.status === 'running' || job.status === 'stopping'
    const msg = running
      ? 'This job is still running. Delete it now? The scrape will be stopped and all its data removed.'
      : 'Delete this job and all its data?'
    if (!window.confirm(msg)) return
    try {
      await api.apolloDelete(job.id)
      setJobs((p) => p.filter((j) => j.id !== job.id))
    } catch (e) {
      toast(e.message || 'Delete failed', 'err')
    }
  }

  if (!configured) {
    return (
      <div className="jg" style={{ marginTop: 20 }}>
        <div className="empty">
          <div className="empty-ic">🪶</div>
          <h3>Apollo server not connected</h3>
          <p>
            Set <code>VITE_APOLLO_SCRAPER_URL</code> to your Apollo scraper server, then redeploy the dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Centered New Job — same sticky bar as the Sales Nav tab */}
      <div className="newjob-bar">
        <button className="btn btn-p" onClick={() => setShowNew(true)}>
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
            <div className="empty-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <line x1="8" y1="8" x2="16" y2="8" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="8" y1="16" x2="12" y2="16" />
              </svg>
            </div>
            <h3>No jobs yet</h3>
            <p>Create your first Apollo scraping job to get started</p>
            <button className="btn btn-p" onClick={() => setShowNew(true)}>
              <IconPlus />
              Create Job
            </button>
          </div>
        ) : (
          slice.map((j) => {
            const otherRunning = jobs.some(
              (x) => x.id !== j.id && (x.status === 'running' || x.status === 'stopping'),
            )
            return (
              <ApolloJobCard
                key={j.id}
                job={j}
                anotherRunning={otherRunning}
                onRun={() => run(j.id)}
                onStop={() => stop(j.id)}
                onDelete={() => remove(j)}
                onOpenLogs={() => setLogsJob(j)}
                downloadUrl={api.apolloDownloadUrl(j.id)}
              />
            )
          })
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

      <ApolloNewJobModal open={showNew} onClose={() => setShowNew(false)} onCreated={upsert} />
      <ApolloLogsModal job={logsJob} onClose={() => setLogsJob(null)} />
    </div>
  )
}

function ApolloLogsModal({ job, onClose }) {
  const [logs, setLogs] = useState([])
  useEffect(() => {
    if (!job) return
    let alive = true
    const load = async () => {
      try {
        const r = await api.apolloLogs(job.id)
        if (alive) setLogs((r && r.logs) || [])
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
    <Modal open={!!job} onClose={onClose} title={`📜 Logs — ${job?.name || ''}`}>
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
        {logs.length ? logs.join('\n') : 'No logs yet.'}
      </pre>
    </Modal>
  )
}
