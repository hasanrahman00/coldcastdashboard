import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import Modal from '../../components/Modal.jsx'
import PostJobCard from './PostJobCard.jsx'
import PostNewJobModal from './PostNewJobModal.jsx'
import ScraperConnection from '../../components/ScraperConnection.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 cols × 3 rows — matches the other scraper grids

// The Post-engagers scraper runs on its OWN server; its jobs are streamed globally by
// the shared AppStore. This tab renders that list + owns the Post-specific UI.
export default function PostScraper() {
  const toast = useToast()
  const configured = api.postConfigured()

  const { postJobs, upsertPostJob, removePostJob, scraperConnected, expired } = useApp()
  const connected = scraperConnected('post')
  const jobs = postJobs || []
  const [page, setPage] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [logsJob, setLogsJob] = useState(null)

  const sorted = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [jobs],
  )
  const pages = Math.max(1, Math.ceil(sorted.length / JOBS_PER_PAGE))
  const safePage = Math.min(page, pages - 1)
  useEffect(() => { if (page > pages - 1) setPage(pages - 1) }, [page, pages])
  const slice = sorted.slice(safePage * JOBS_PER_PAGE, safePage * JOBS_PER_PAGE + JOBS_PER_PAGE)

  const goPage = (delta) => {
    setPage((p) => Math.min(Math.max(0, p + delta), pages - 1))
    const cnt = document.querySelector('.cnt')
    if (cnt) cnt.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const run = async (id) => {
    try {
      await api.postStart(id)
    } catch (e) {
      const m = e.message || 'Could not start'
      if (/🔑|🧩|extension/i.test(m)) {
        const job = sorted.find((j) => j.id === id)
        if (job) setLogsJob(job); else toast(m, 'err')
      } else toast(m, 'err')
    }
  }
  const stop = async (id) => {
    try { await api.postStop(id) } catch (e) { toast(e.message || 'Could not stop', 'err') }
  }
  const remove = async (job) => {
    const running = job.status === 'running' || job.status === 'queued'
    const msg = running
      ? 'This job is still running. Delete it now? The scrape will be stopped and all its data removed.'
      : 'Delete this job and all its data?'
    if (!window.confirm(msg)) return
    try { await api.postDelete(job.id); removePostJob(job.id) } catch (e) { toast(e.message || 'Delete failed', 'err') }
  }

  if (!configured) {
    return (
      <div className="jg" style={{ marginTop: 20 }}>
        <div className="empty">
          <div className="empty-ic">👥</div>
          <h3>Post scraper server not connected</h3>
          <p>Set <code>VITE_POST_SCRAPER_URL</code> to your Post-engagers scraper server, then redeploy the dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ScraperConnection scraper="post" name="Post-engagers scraping" />

      <div className="newjob-bar">
        <button
          className="btn btn-p"
          onClick={() => setShowNew(true)}
          disabled={!connected || expired}
          title={expired ? 'Account expired — renew to run jobs' : connected ? '' : 'Connect the Coldcast extension in this browser to run a job here'}
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
            <div className="empty-ic">👥</div>
            <h3>No jobs yet</h3>
            <p>Paste a LinkedIn post URL to pull everyone who engaged with it</p>
            <button className="btn btn-p" onClick={() => setShowNew(true)} disabled={expired} title={expired ? 'Account expired — renew to run jobs' : ''}>
              <IconPlus />
              Create Job
            </button>
          </div>
        ) : (
          slice.map((j) => {
            const otherRunning = jobs.some((x) => x.id !== j.id && (x.status === 'running' || x.status === 'queued'))
            return (
              <PostJobCard
                key={j.id}
                job={j}
                anotherRunning={otherRunning || expired}
                onRun={() => run(j.id)}
                onStop={() => stop(j.id)}
                onDelete={() => remove(j)}
                onOpenLogs={() => setLogsJob(j)}
                downloadUrl={api.postDownloadUrl(j.id)}
              />
            )
          })
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

      <PostNewJobModal open={showNew} onClose={() => setShowNew(false)} onCreated={upsertPostJob} />
      <PostLogsModal job={logsJob} onClose={() => setLogsJob(null)} />
    </div>
  )
}

function PostLogsModal({ job, onClose }) {
  const [logs, setLogs] = useState([])
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const text = logs.join('\n')
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }
  useEffect(() => {
    if (!job) return
    let alive = true
    const load = async () => {
      try { const r = await api.postLogs(job.id); if (alive) setLogs((r && r.logs) || []) } catch {}
    }
    load()
    const t = setInterval(load, 2000)
    return () => { alive = false; clearInterval(t) }
  }, [job])

  return (
    <Modal open={!!job} onClose={onClose} title={`📜 Logs — ${job?.name || ''}`}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-s" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={copy} disabled={!logs.length}>
          {copied ? '✓ Copied' : '📋 Copy logs'}
        </button>
      </div>
      <pre style={{ maxHeight: '55vh', overflow: 'auto', background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace", fontSize: 12.5, lineHeight: 1.65, whiteSpace: 'pre-wrap', color: 'var(--text)', margin: 0 }}>
        {logs.length ? logs.join('\n') : 'No logs yet.'}
      </pre>
    </Modal>
  )
}
