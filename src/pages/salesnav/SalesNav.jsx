import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import JobCard from './JobCard.jsx'
import NewJobModal from './NewJobModal.jsx'
import LogsModal from './LogsModal.jsx'
import { IconPlus, IconChevronLeft, IconChevronRight, IconFile } from '../../lib/icons.jsx'

const JOBS_PER_PAGE = 9 // 3 cols × 3 rows

export default function SalesNav() {
  const { jobs } = useApp()
  const [page, setPage] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [logsJob, setLogsJob] = useState(null)

  // newest-first
  const sorted = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [jobs],
  )

  const pages = Math.max(1, Math.ceil(sorted.length / JOBS_PER_PAGE))
  // `safePage` is the clamped value used for THIS render; the effect below
  // corrects the stored `page` if jobs shrank (e.g. a delete emptied a page).
  // Clamping in an effect keeps render pure (no setState during render).
  const safePage = Math.min(page, pages - 1)
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1)
  }, [page, pages])
  const slice = sorted.slice(safePage * JOBS_PER_PAGE, safePage * JOBS_PER_PAGE + JOBS_PER_PAGE)

  const goPage = (delta) => {
    setPage((p) => Math.min(Math.max(0, p + delta), pages - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      {/* Sticky, centred New Job bar — stays visible across pages. */}
      <div className="sticky top-[58px] z-30 -mx-1 mb-5 flex items-center justify-center bg-canvas/80 py-3 backdrop-blur">
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark"
        >
          <IconPlus className="h-4 w-4" /> New Job
        </button>
        {jobs.length > 0 && (
          <span className="ml-3 text-sm font-medium text-muted">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState onNew={() => setShowNew(true)} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slice.map((j) => (
              <JobCard key={j.id} job={j} onOpenLogs={setLogsJob} />
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                onClick={() => goPage(-1)}
                disabled={safePage <= 0}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-card text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-muted">
                Page {safePage + 1} of {pages}
              </span>
              <button
                onClick={() => goPage(1)}
                disabled={safePage >= pages - 1}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-card text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      <NewJobModal open={showNew} onClose={() => setShowNew(false)} />
      <LogsModal job={logsJob} onClose={() => setLogsJob(null)} />
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div className="cc-card-in flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-card px-6 py-16 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <IconFile className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-extrabold text-ink">No jobs yet</h3>
      <p className="mt-1 text-sm text-muted">
        Create your first scraping job to get started.
      </p>
      <button
        onClick={onNew}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
      >
        <IconPlus className="h-4 w-4" /> Create Job
      </button>
    </div>
  )
}
