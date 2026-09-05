import { useState, useEffect, useMemo, useRef } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import Modal from '../../components/Modal.jsx'
import ApolloJobCard from './ApolloJobCard.jsx'   // generic card (moved out of the removed paid-Apollo dir)
import ApolloFreeNewJobModal from './ApolloFreeNewJobModal.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 cols × 3 rows

// Apollo FREE runs on its OWN server (the extension-bridge webapp). Its jobs are streamed
// globally by the shared AppStore (so the header counters stay live from any tab); this tab
// renders that shared list + the Apollo-Free-specific UI.
export default function ApolloFreeScraper() {
  const toast = useToast()
  const configured = api.apolloFreeConfigured()

  const { apolloFreeJobs, upsertApolloFreeJob, removeApolloFreeJob, scraperConnected, expired, busyJob, onlineProfileId, refreshProfiles } = useApp()
  const connected = scraperConnected('apollofree')
  const jobs = apolloFreeJobs || []
  const [page, setPage] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [logsJob, setLogsJob] = useState(null)

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

  // Auto-open the logs ONCE when a job pauses for an action the user must take in their Apollo tab
  // (not signed in / captcha / account restricted) — so a non-technical user immediately sees the
  // exact instruction. Keyed on `${id}:${pauseAt}` so it fires exactly once per pause and never
  // reopens after the user closes it; a Re-run clears pauseAt server-side, re-arming it.
  const autoOpenedRef = useRef(new Set())
  useEffect(() => {
    for (const j of jobs) {
      if (!j || !j.pauseReason || !j.pauseAt) continue
      const key = `${j.id}:${j.pauseAt}`
      if (autoOpenedRef.current.has(key)) continue
      autoOpenedRef.current.add(key)
      setLogsJob(j)
      break   // one at a time
    }
  }, [jobs])

  const run = async (id) => {
    // Auto-select the CURRENT browser: onlineProfileId is the profile the extension is connected
    // as in THIS browser (from the localExt postMessage bridge, refreshed every ~2.5s + on focus),
    // independent of how many profiles the account has. Block early with a clear message when this
    // browser isn't connected, instead of sending null and letting the server run the stale
    // create-time profile.
    if (!onlineProfileId) {
      return toast('No connected browser found — open the Coldcast extension in this Chrome (set your API key until it shows “connected”), then Run again.', 'err')
    }
    try {
      // Freshen the server's online view right before binding, then send the current browser's
      // profileId so the server re-binds the job to it (the user may have switched browsers since
      // creating the job). Freshness is the localExt bridge + this refresh, NOT SSE.
      await refreshProfiles().catch(() => {})
      await api.apolloFreeStart(id, onlineProfileId)
    } catch (e) {
      toast(e.message || 'Could not start', 'err')
    }
  }
  const stop = async (id) => {
    try {
      await api.apolloFreeStop(id)
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
      await api.apolloFreeDelete(job.id)
      removeApolloFreeJob(job.id)
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
            Set <code>VITE_APOLLO_FREE_SCRAPER_URL</code> to your Apollo scraper server, then redeploy the dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Centered New Job — same sticky bar as the other scraper tabs */}
      <div className="newjob-bar">
        <button
          className="btn btn-p"
          onClick={() => setShowNew(true)}
          // Creating/queuing a job does NOT need the extension — only RUNNING it does (the Run
          // button + server enforce the connection). Matches the empty-state "Create Job" button,
          // which was never gated on `connected`. So don't block creation on the hub connection.
          disabled={expired || !!busyJob}
          title={
            expired ? 'Account expired — renew to run jobs'
              : busyJob ? `Finish your ${busyJob.scraper} job first — only one job runs at a time across all scrapers`
              : !connected ? 'Tip: connect the Coldcast extension to Apollo in this browser before you Run this job'
              : ''
          }
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
            <button className="btn btn-p" onClick={() => setShowNew(true)} disabled={expired || !!busyJob} title={expired ? 'Account expired — renew to run jobs' : busyJob ? 'Finish your running job first — only one at a time' : ''}>
              <IconPlus />
              Create Job
            </button>
          </div>
        ) : (
          slice.map((j) => {
            const otherRunning = !!busyJob && busyJob.id !== j.id   // one job at a time across ALL scrapers
            return (
              <ApolloJobCard
                key={j.id}
                job={j}
                anotherRunning={otherRunning || expired}
                onRun={() => run(j.id)}
                onStop={() => stop(j.id)}
                onDelete={() => remove(j)}
                onOpenLogs={() => setLogsJob(j)}
                downloadUrl={api.apolloFreeDownloadUrl(j.id)}
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

      <ApolloFreeNewJobModal open={showNew} onClose={() => setShowNew(false)} onCreated={upsertApolloFreeJob} />
      <ApolloFreeLogsModal job={logsJob} onClose={() => setLogsJob(null)} />
    </div>
  )
}

function ApolloFreeLogsModal({ job, onClose }) {
  const [logs, setLogs] = useState([])
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const text = logs.join('\n')
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }
  useEffect(() => {
    if (!job) return
    let alive = true
    const load = async () => {
      try {
        const r = await api.apolloFreeLogs(job.id)
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-s" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={copy} disabled={!logs.length}>
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
        {logs.length
          ? logs.flatMap((l) => String(l).split('\n')).filter((l) => l.trim()).map((line, i) => (
              <div key={i} style={{ marginBottom: 9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{line}</div>
            ))
          : <div style={{ color: 'var(--text-faint)' }}>No logs yet.</div>}
      </div>
    </Modal>
  )
}
