// ─────────────────────────────────────────────────────────────────────────────
//  JobEnrich — per-job email-enrichment control, shown on each scrape job card
//  right after the leads count. Lifecycle:
//    idle (scrape done/stopped, has leads) → "Enrich N rows" button
//    running → live "Enriching {done} / {total}" + progress bar
//    done    → "{valid} valid" + CSV / XLSX download (+ re-run)
//    error   → message + retry
//
//  Mutual exclusion is enforced by the card: Enrich is disabled while the scrape
//  is busy, and the scrape Run is disabled while this enrich is active (JobCard).
// ─────────────────────────────────────────────────────────────────────────────
import { useApp, ENRICH_ACTIVE } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { IconMailCheck, IconDownload, IconRetry, IconWarn } from '../../lib/icons.jsx'

export default function JobEnrich({ job, scrapeBusy, hasData }) {
  const { enrichByJob, startEnrich, enrichDownloadUrl } = useApp()
  const toast = useToast()

  const e = enrichByJob[job.id] || null
  const status = e?.status || 'idle'
  const active = ENRICH_ACTIVE.includes(status)
  const total = (e?.total || job.totalLeads || 0)
  const done = e?.done || 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  const start = async () => {
    try { await startEnrich(job) }
    catch (err) { toast(err.message || 'Could not start enrichment', 'err') }
  }
  const dl = (fmt) => window.open(enrichDownloadUrl(e.enrichJobId, 'valid', fmt), '_blank')

  // Nothing to enrich yet (scrape produced no leads and no enrich exists).
  if (!hasData && !e) return null

  // ── Active: live count + progress ──────────────────────────────────────
  if (active) {
    const label = status === 'uploading' ? 'Preparing…' : 'Enriching'
    return (
      <div className="jc-enrich">
        <div className="jc-enrich-h">
          <IconMailCheck />
          <span>{label}</span>
          <span className="n">{done.toLocaleString()}</span>
          <span className="muted">/ {total.toLocaleString()}</span>
        </div>
        <div className="jc-p">
          <div className="jc-pb" style={{ width: pct + '%' }} />
        </div>
      </div>
    )
  }

  // ── Done (has results) ─────────────────────────────────────────────────
  if (status === 'done' || status === 'completed' || ((status === 'stopped' || status === 'paused') && done > 0)) {
    const valid = e.valid ?? done ?? 0
    return (
      <div className="jc-enrich done">
        <div className="jc-enrich-h">
          <IconMailCheck />
          <span>Enriched</span>
          <span className="n">{valid.toLocaleString()}</span>
          <span className="muted">valid{e.haltReason ? ` · ${e.haltReason}` : ''}</span>
        </div>
        {e.merging && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' }}>Adding emails to the job file…</div>}
        {e.merged && <div style={{ fontSize: 11.5, fontWeight: 700, color: '#047857' }}>✓ Emails added to the job CSV{typeof e.mergedCount === 'number' ? ` (${e.mergedCount})` : ''}</div>}
        {e.mergeError && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--red)' }}>{e.mergeError}</div>}
        <div className="jc-enrich-dl">
          <button className="btn btn-csv btn-sm" onClick={() => dl('csv')}>
            <IconDownload /> CSV
          </button>
          <button className="btn btn-xlsx btn-sm" onClick={() => dl('xlsx')}>
            <IconDownload /> XLSX
          </button>
          <button className="btn btn-enr btn-sm" disabled={scrapeBusy} title="Re-run enrichment" onClick={start}>
            <IconRetry /> Again
          </button>
        </div>
      </div>
    )
  }

  // ── Failed / errored ───────────────────────────────────────────────────
  if (status === 'error' || status === 'failed' || status === 'cancelled') {
    return (
      <div className="jc-enrich err">
        <div className="jc-enrich-h">
          <IconWarn />
          <span>{e?.error || 'Enrichment failed'}</span>
        </div>
        <button className="btn btn-enr btn-sm" disabled={scrapeBusy} onClick={start}>
          <IconRetry /> Retry enrich
        </button>
      </div>
    )
  }

  // ── Idle: the Enrich entry button (shows the total rows it will enrich) ──
  return (
    <div className="jc-enrich">
      <button
        className="btn btn-enr btn-sm"
        disabled={scrapeBusy}
        title={scrapeBusy ? 'Wait for scraping to finish' : 'Find verified emails for these leads'}
        onClick={start}
      >
        <IconMailCheck /> Enrich {total.toLocaleString()} Emails
      </button>
    </div>
  )
}
