import { useApp } from '../store/AppStore.jsx'
import { getProduct } from '../lib/products.js'
import { SERVICES } from '../lib/services.js'

const badgeCls = (s) => (s.deal ? 'deal' : s.badge === 'Free' ? 'free' : 'dfy')

// Home ("Dashboard") — greeting hero, grouped tool cards (real product logos kept), and a
// recent-jobs strip aggregated across every scraper. Matches the approved shell mockup.
const GROUPS = [
  { title: 'Scrapers',   ids: ['salesnav', 'company', 'apollo', 'zoominfo', 'lisearch', 'post'] },
  { title: 'Enrichment', ids: ['linkedin', 'waterfall', 'verify', 'domain'] },
]

const ArrowGo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Job shapes differ per scraper — read the row count + timestamp defensively.
// (Apollo uses totalScraped; salesnav/company use totalLeads; zoominfo/lisearch/post/domain
// use counts.total; the URL enricher uses total.)
const jobCount = (j) => j.totalLeads ?? j.totalScraped ?? (j.counts && j.counts.total) ?? j.total ?? j.rows ?? j.leads ?? 0
// createdAt is an ISO STRING for scraper jobs and a number for enricher uploads — new Date()
// handles both. Missing → epoch (sorts last). Subtracting the raw strings would give NaN and
// leave the list unsorted.
const jobMs = (j) => new Date(j.createdAt || j.startedAt || j.at || 0).getTime()

function statusChip(s) {
  if (s === 'running' || s === 'stopping' || s === 'queued' || s === 'pausing')
    return { cls: 'run', txt: s === 'stopping' ? 'Stopping' : s === 'pausing' ? 'Pausing' : 'Running' }
  if (s === 'done') return { cls: 'done', txt: 'Done' }
  if (s === 'stopped' || s === 'paused' || s === 'interrupted') return { cls: 'stop', txt: 'Paused' }
  if (s === 'cancelled') return { cls: 'stop', txt: 'Cancelled' }
  if (s === 'failed' || s === 'error') return { cls: 'err', txt: 'Failed' }
  return { cls: 'idle', txt: 'Ready' }
}

function ToolCard({ p, nav, count }) {
  const Icon = p.icon
  return (
    <button className="thome-card" data-p={p.id} onClick={() => nav(p.id)} aria-label={`Open ${p.label}`}>
      <span className="thome-go"><ArrowGo /></span>
      <span className={'thome-ic' + (p.image ? ' img' : '')}>
        {p.image ? <img src={p.image} alt="" /> : (p.emoji || <Icon />)}
      </span>
      <h4 className="thome-name">{p.navLabel || p.label}</h4>
      <p className="thome-desc">{p.short || p.body || ''}</p>
      <div className="thome-foot">
        <span className="thome-live"><i />Live</span>
        {count > 0 && <span className="thome-cnt">{count} job{count === 1 ? '' : 's'}</span>}
      </div>
    </button>
  )
}

export default function ProductsHome({ nav }) {
  const {
    me, jobs, companyJobs, apolloJobs, zoominfoJobs, lisearchJobs,
    postJobs, enricherJobs, domainJobs, browserConnected,
    enrichUploads, verifyUploads,
  } = useApp()

  const name = me?.user?.username || 'there'
  const hour = new Date().getHours()
  const partOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greet = hour < 5 ? `Working late, ${name}?` : `${partOfDay}, ${name}.`

  const arrays = {
    salesnav: jobs, company: companyJobs, apollo: apolloJobs, zoominfo: zoominfoJobs,
    lisearch: lisearchJobs, post: postJobs, linkedin: enricherJobs, domain: domainJobs,
  }
  const countOf = (id) => {
    if (id === 'waterfall') return Object.keys(enrichUploads || {}).length
    if (id === 'verify') return Object.keys(verifyUploads || {}).length
    return (arrays[id] || []).length
  }

  const recent = Object.entries(arrays)
    .flatMap(([pid, arr]) => (arr || []).map((j) => ({ key: `${pid}-${j.id}`, pid, j })))
    .sort((a, b) => jobMs(b.j) - jobMs(a.j))
    .slice(0, 6)

  const groups = GROUPS.map((g) => ({ ...g, items: g.ids.map(getProduct).filter(Boolean) }))

  return (
    <div className="thome">
      <div className="thome-hero">
        <span className="thome-eyebrow">
          <span className={'d' + (browserConnected ? '' : ' off')} />
          {browserConnected ? 'Extension connected · jobs run in your browser' : 'Connect the extension to start scraping'}
        </span>
        <h2>{greet}</h2>
        <p>Pick a source to scrape or an enrichment to run. Every tool exports a clean, verified CSV.</p>
      </div>

      {groups.map((g) => (
        <section className="thome-sec" key={g.title}>
          <div className="thome-sechead"><h3>{g.title}</h3><span className="rule" /></div>
          <div className="thome-grid">
            {g.items.map((p) => <ToolCard key={p.id} p={p} nav={nav} count={countOf(p.id)} />)}
          </div>
        </section>
      ))}

      <section className="thome-sec">
        <div className="thome-sechead"><h3>Services</h3><span className="rule" /></div>
        <div className="thome-grid">
          {SERVICES.map((s) => {
            const Icon = s.icon
            return (
              <button className="thome-card" key={s.id} onClick={() => nav(s.id)} aria-label={s.label}>
                <span className="thome-go"><ArrowGo /></span>
                <span className="thome-ic">{s.emoji || <Icon />}</span>
                <h4 className="thome-name">{s.label}</h4>
                <p className="thome-desc">{s.short}</p>
                <div className="thome-foot">
                  <span className={'thome-badge ' + badgeCls(s)}>{s.badge}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="thome-sec">
        <div className="thome-sechead"><h3>Recent jobs</h3><span className="rule" /></div>
        {recent.length ? (
          <div className="thome-recent">
            {recent.map(({ key, pid, j }) => {
              const p = getProduct(pid)
              const st = statusChip(j.status)
              return (
                <button className="jrow" key={key} onClick={() => nav(pid)} aria-label={`Open ${j.name || 'job'}`}>
                  <span className="jrow-ic">{p?.image ? <img src={p.image} alt="" /> : (p?.emoji || '•')}</span>
                  <span className="jrow-name">
                    <b>{j.name || 'Untitled job'}</b>
                    <span>{p?.navLabel || pid}</span>
                  </span>
                  <span className="jrow-cnt">{jobCount(j).toLocaleString()} rows</span>
                  <span className={'jst ' + st.cls}>{st.cls === 'run' && <i />}{st.txt}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="thome-empty">No jobs yet — pick a tool above to start your first scrape.</p>
        )}
      </section>
    </div>
  )
}
