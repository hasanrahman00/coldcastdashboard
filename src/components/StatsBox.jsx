import { useApp, ENRICH_ACTIVE } from '../store/AppStore.jsx'
import { IconGrid, IconPlay } from '../lib/icons.jsx'

// A light, at-a-glance activity caption above the product nav. It used to also carry
// the connection pill, a Get-extension button, and the API-key field — those moved to
// the top bar / account menu so this reads as one clean line, not a busy card.
export default function StatsBox() {
  const { jobs, apolloJobs, enricherJobs, companyJobs, enrichUploads } = useApp()

  // Jobs + Running span ALL products: Sales Nav + Apollo + Company scrape jobs,
  // LinkedIn URL enricher jobs, and Waterfall enrich uploads.
  const enrichJobs = Object.values(enrichUploads || {})
  const apollo = apolloJobs || []
  const linkedin = enricherJobs || []
  const company = companyJobs || []
  const totalJobs = jobs.length + apollo.length + company.length + linkedin.length + enrichJobs.length
  const running =
    jobs.filter((j) => j.status === 'running').length +
    apollo.filter((j) => j.status === 'running' || j.status === 'stopping').length +
    company.filter((j) => j.status === 'running' || j.status === 'stopping').length +
    linkedin.filter((j) => j.status === 'running' || j.status === 'queued').length +
    enrichJobs.filter((e) => ENRICH_ACTIVE.includes(e.status)).length

  return (
    <div className="statsbar">
      <span className="sb-metric">
        <span className="sb-ic b"><IconGrid /></span>
        <b>{totalJobs}</b> Total jobs
      </span>
      <span className="sb-sep" />
      <span className="sb-metric">
        <span className="sb-ic pr"><IconPlay /></span>
        <b>{running}</b> Running
      </span>
    </div>
  )
}
