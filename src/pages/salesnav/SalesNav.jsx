import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import JobCard from './JobCard.jsx'
import NewJobModal from './NewJobModal.jsx'
import LogsModal from './LogsModal.jsx'
import ScraperConnection from '../../components/ScraperConnection.jsx'
import ProviderStatus from '../../components/ProviderStatus.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 cols × 3 rows

export default function SalesNav() {
  const { jobs, scraperConnected, expired } = useApp()
  const connected = scraperConnected('salesnav')
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

  return (
    <div>
      <ScraperConnection scraper="salesnav" name="Sales Navigator scraping" />
      <ProviderStatus />

      {/* Centered New Job — sticky so it stays visible on any job page */}
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
        <button
          className="btn btn-g"
          onClick={() => { window.location.hash = '#/setup' }}
          title="Get free Lusha, ContactOut & SalesQL accounts"
        >
          Fetch Free Accounts
        </button>
      </div>

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
            <button className="btn btn-p" onClick={() => setShowNew(true)} disabled={expired} title={expired ? 'Account expired — renew to run jobs' : ''}>
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
    </div>
  )
}
