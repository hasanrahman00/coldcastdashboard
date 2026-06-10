import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import JobCard from './JobCard.jsx'
import NewJobModal from './NewJobModal.jsx'
import LogsModal from './LogsModal.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 cols × 3 rows

export default function SalesNav() {
  const { jobs, usage } = useApp()
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

  const limit = usage?.limit || 0
  const used = usage?.used || 0
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const remaining = Math.max(0, limit - used)
  const atLimit = limit > 0 && used >= limit
  const nearLimit = limit > 0 && used >= limit * 0.9

  return (
    <div>
      {/* Centered New Job — sticky so it stays visible on any job page */}
      <div className="newjob-bar">
        <button className="btn btn-p" onClick={() => setShowNew(true)}>
          <IconPlus />
          New Job
        </button>
      </div>

      {limit > 0 && (
        <div className="scrape-usage">
          <div className="scrape-usage-top">
            <span className="scrape-usage-label">Daily scraping</span>
            <span className="scrape-usage-nums">
              <b style={{ color: atLimit ? 'var(--red)' : 'var(--text)' }}>{used.toLocaleString()}</b>
              {' / '}
              {limit.toLocaleString()} rows
              <span className="scrape-usage-left">
                {' · '}
                {atLimit ? 'limit reached — resets 00:00 UTC' : `${remaining.toLocaleString()} left today`}
              </span>
            </span>
          </div>
          <div className="scrape-usage-bar">
            <div
              className="scrape-usage-fill"
              style={{ width: pct + '%', background: nearLimit ? 'var(--red)' : 'var(--brand-grad)' }}
            />
          </div>
        </div>
      )}

      <div className="jg-head">
        <h3>Active Jobs</h3>
        <span className="count">
          {jobs.length ? `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}` : ''}
        </span>
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
            <p>Create your first scraping job to get started</p>
            <button className="btn btn-p" onClick={() => setShowNew(true)}>
              <IconPlus />
              Create Job
            </button>
          </div>
        ) : (
          slice.map((j) => <JobCard key={j.id} job={j} onOpenLogs={setLogsJob} />)
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

      <NewJobModal open={showNew} onClose={() => setShowNew(false)} />
      <LogsModal job={logsJob} onClose={() => setLogsJob(null)} />

      <style>{`
        .scrape-usage{margin:0 0 18px;padding:12px 16px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-elev-1)}
        .scrape-usage-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}
        .scrape-usage-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-dim)}
        .scrape-usage-nums{font-size:12.5px;color:var(--text-muted)}
        .scrape-usage-nums b{font-size:14px}
        .scrape-usage-left{color:var(--text-faint);margin-left:2px}
        .scrape-usage-bar{height:7px;border-radius:5px;background:var(--bg-elev-3);overflow:hidden}
        .scrape-usage-fill{height:100%;border-radius:5px;transition:width .4s ease}
      `}</style>
    </div>
  )
}
