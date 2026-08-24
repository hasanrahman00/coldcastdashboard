import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import Modal from '../../components/Modal.jsx'
import LinkedInSearchJobCard from './LinkedInSearchJobCard.jsx'
import LinkedInSearchNewJobModal from './LinkedInSearchNewJobModal.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9

export default function LinkedInSearchScraper() {
  const toast = useToast()
  const configured = api.lisearchConfigured()

  const { lisearchJobs, upsertLisearchJob, removeLisearchJob, scraperConnected, expired, busyJob } = useApp()
  const connected = scraperConnected('lisearch')
  const jobs = lisearchJobs || []
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
    try { await api.lisearchStart(id) }
    catch (e) {
      const m = e.message || 'Could not start'
      if (/🔑|🧩|extension/i.test(m)) { const job = sorted.find((j) => j.id === id); if (job) setLogsJob(job); else toast(m, 'err') }
      else toast(m, 'err')
    }
  }
  const stop = async (id) => {
    const j = jobs.find((x) => x.id === id)
    if (j) upsertLisearchJob({ ...j, status: 'stopping', stopRequested: true }) // instant feedback; server confirms
    try { await api.lisearchStop(id) } catch (e) { toast(e.message || 'Could not stop', 'err') }
  }
  const remove = async (job) => {
    const running = job.status === 'running' || job.status === 'queued'
    if (!window.confirm(running ? 'This job is still running. Delete it now?' : 'Delete this job and all its data?')) return
    try { await api.lisearchDelete(job.id); removeLisearchJob(job.id) } catch (e) { toast(e.message || 'Delete failed', 'err') }
  }

  if (!configured) {
    return (
      <div className="jg" style={{ marginTop: 20 }}>
        <div className="empty">
          <div className="empty-ic">🕵️</div>
          <h3>LinkedIn Search server not connected</h3>
          <p>Set <code>VITE_LISEARCH_SCRAPER_URL</code> to your LinkedIn search server, then redeploy the dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="newjob-bar">
        <button
          className="btn btn-p"
          onClick={() => setShowNew(true)}
          disabled={!connected || expired || !!busyJob}
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
            <div className="empty-ic">🕵️</div>
            <h3>No jobs yet</h3>
            <p>Paste a LinkedIn People or Services search URL to export it</p>
            <button className="btn btn-p" onClick={() => setShowNew(true)} disabled={expired || !!busyJob} title={expired ? 'Account expired — renew to run jobs' : busyJob ? 'Finish your running job first — only one at a time' : ''}>
              <IconPlus />
              Create Job
            </button>
          </div>
        ) : (
          slice.map((j) => {
            const otherRunning = !!busyJob && busyJob.id !== j.id
            return (
              <LinkedInSearchJobCard
                key={j.id}
                job={j}
                anotherRunning={otherRunning || expired}
                onRun={() => run(j.id)}
                onStop={() => stop(j.id)}
                onDelete={() => remove(j)}
                onOpenLogs={() => setLogsJob(j)}
                downloadUrl={api.lisearchDownloadUrl(j.id)}
              />
            )
          })
        )}
      </div>

      {pages > 1 && (
        <div className="jpag">
          <button className="btn btn-g btn-sm" disabled={safePage <= 0} onClick={() => goPage(-1)}><IconChevronLeft /> Previous</button>
          <span className="jpag-info">Page {safePage + 1} of {pages}</span>
          <button className="btn btn-g btn-sm" disabled={safePage >= pages - 1} onClick={() => goPage(1)}>Next <IconChevronRight /></button>
        </div>
      )}

      <LinkedInSearchNewJobModal open={showNew} onClose={() => setShowNew(false)} onCreated={upsertLisearchJob} />
      <LinkedInSearchLogsModal job={logsJob} onClose={() => setLogsJob(null)} />
    </div>
  )
}

function LinkedInSearchLogsModal({ job, onClose }) {
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
    const load = async () => { try { const r = await api.lisearchLogs(job.id); if (alive) setLogs((r && r.logs) || []) } catch {} }
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
      <pre style={{ maxHeight: '55vh', overflow: 'auto', background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12.5, lineHeight: 1.65, whiteSpace: 'pre-wrap', color: 'var(--text)', margin: 0 }}>
        {logs.length ? logs.join('\n') : 'No logs yet.'}
      </pre>
    </Modal>
  )
}
