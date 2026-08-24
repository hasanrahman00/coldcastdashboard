import { useApp } from '../store/AppStore.jsx'
import { NavIcon } from '../lib/navicons.jsx'

// Home ("Dashboard") — EXACT mockup: greeting hero, grouped tool cards with the mockup's
// gradient icon tiles + line icons + copy, and a recent-jobs strip. Services live on their
// own "Done-for-you" page (sidebar), not here.
const SCRAPERS = [
  { id: 'salesnav', grad: 't-nav', title: 'Sales Navigator', desc: 'Enriched lead lists from your Sales Navigator searches — names, titles, verified emails.' },
  { id: 'company', grad: 't-co', title: 'Sales Nav Accounts', desc: 'Company & account lists from your Sales Navigator account searches, domain-enriched.' },
  { id: 'apollo', grad: 't-apollo', title: 'Apollo', desc: 'Targeted contact & company lists straight from your Apollo searches, verified.' },
  { id: 'zoominfo', grad: 't-zi', title: 'ZoomInfo', desc: 'Pull contacts & accounts from ZoomInfo into clean CSVs — direct dials and work emails.' },
  { id: 'lisearch', grad: 't-search', title: 'LinkedIn Search', desc: 'Any People or Services search → clean CSV, scraped in your own connected browser.' },
  { id: 'post', grad: 't-post', title: 'Post Engagers', desc: 'Everyone who reacted, commented, or reposted a LinkedIn post — one URL in, list out.' },
]
const ENRICHMENT = [
  { id: 'linkedin', grad: 't-url', title: 'LinkedIn URL Enrich', desc: 'Turn profile URLs into names, verified emails & firmographics — Lusha, ContactOut, SalesQL.' },
  { id: 'waterfall', grad: 't-water', title: 'Waterfall Enrich', desc: 'Chain providers to maximize verified-email coverage, then run the built-in verifier.' },
  { id: 'verify', grad: 't-verify', title: 'Email Verify', desc: 'Bulk-validate — syntax, MX, SMTP, catch-all & risk — so you only send to deliverable inboxes.' },
  { id: 'domain', grad: 't-ai', title: 'AI SDR · Domain', desc: 'Turn company domains into full firmographics — the enrichment engine, pointed at domains.' },
]
const ALL_TOOLS = [...SCRAPERS, ...ENRICHMENT]
const GRAD = Object.fromEntries(ALL_TOOLS.map((t) => [t.id, t.grad]))
const LABEL = Object.fromEntries(ALL_TOOLS.map((t) => [t.id, t.title]))

const ArrowGo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Job shapes differ per scraper — read the row count + timestamp defensively.
const jobCount = (j) => j.totalLeads ?? j.totalScraped ?? (j.counts && j.counts.total) ?? j.total ?? j.rows ?? j.leads ?? 0
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

function ToolCard({ t, nav, count }) {
  return (
    <button className="thome-card" onClick={() => nav(t.id)} aria-label={`Open ${t.title}`}>
      <span className="thome-go"><ArrowGo /></span>
      <span className={'thome-ic grad ' + t.grad}><NavIcon k={t.id} /></span>
      <h4 className="thome-name">{t.title}</h4>
      <p className="thome-desc">{t.desc}</p>
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
  } = useApp()

  const name = me?.user?.username || 'there'
  const hour = new Date().getHours()
  const partOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greet = hour < 5 ? `Working late, ${name}?` : `${partOfDay}, ${name}.`

  const arrays = {
    salesnav: jobs, company: companyJobs, apollo: apolloJobs, zoominfo: zoominfoJobs,
    lisearch: lisearchJobs, post: postJobs, linkedin: enricherJobs, domain: domainJobs,
  }
  const countOf = (id) => (arrays[id] || []).length

  const recent = Object.entries(arrays)
    .flatMap(([pid, arr]) => (arr || []).map((j) => ({ key: `${pid}-${j.id}`, pid, j })))
    .sort((a, b) => jobMs(b.j) - jobMs(a.j))
    .slice(0, 5)

  return (
    <div className="thome">
      <div className="thome-hero">
        <span className="thome-eyebrow">
          <span className={'d' + (browserConnected ? '' : ' off')} />
          {browserConnected ? 'Everything connected · jobs run in your browser' : 'Connect the extension to start scraping'}
        </span>
        <h2>{greet}</h2>
        <p>Pick a source to scrape or an enrichment to run. Every tool exports a clean, verified CSV — and shows the cost before anything runs.</p>
      </div>

      <section className="thome-sec">
        <div className="thome-sechead"><h3>Scrapers</h3><span className="rule" /></div>
        <div className="thome-grid">
          {SCRAPERS.map((t) => <ToolCard key={t.id} t={t} nav={nav} count={countOf(t.id)} />)}
        </div>
      </section>

      <section className="thome-sec">
        <div className="thome-sechead"><h3>Enrichment</h3><span className="rule" /></div>
        <div className="thome-grid">
          {ENRICHMENT.map((t) => <ToolCard key={t.id} t={t} nav={nav} count={countOf(t.id)} />)}
        </div>
      </section>

      <section className="thome-sec">
        <div className="thome-sechead"><h3>Recent jobs</h3><span className="rule" /></div>
        {recent.length ? (
          <div className="thome-recent">
            {recent.map(({ key, pid, j }) => {
              const st = statusChip(j.status)
              return (
                <button className="jrow" key={key} onClick={() => nav(pid)} aria-label={`Open ${j.name || 'job'}`}>
                  <span className={'jrow-ic grad ' + (GRAD[pid] || '')}><NavIcon k={pid} /></span>
                  <span className="jrow-name">
                    <b>{j.name || 'Untitled job'}</b>
                    <span>{LABEL[pid] || pid}</span>
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
