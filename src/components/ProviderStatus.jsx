import { useApp } from '../store/AppStore.jsx'

// Live "which enrichment sources am I signed into?" badges for THIS browser.
// The Coldcast extension checks each provider's cookies in the background and
// reports them through the dashboard bridge (localExt.providers). It re-checks
// every few seconds while the dashboard is open, so logging in or out of a
// provider flips its badge within seconds — no reload. This helps non-technical
// users see, at a glance, exactly which sources to sign into before a job runs.
// Lusha / ContactOut / SalesQL only need a FREE account — that's all the scraper
// uses. LinkedIn is the user's own Sales Nav session (not a free signup). Each
// badge links to that source's login page so the user can sign in in one click.
const PROVIDERS = [
  { key: 'lusha',      label: 'Free Lusha',               url: 'https://www.lusha.com/login/' },
  { key: 'contactout', label: 'Free ContactOut',          url: 'https://contactout.com/login' },
  { key: 'salesql',    label: 'Free SalesQL',             url: 'https://salesql.com/' },
  { key: 'linkedin',   label: 'LinkedIn Sales Navigator', url: 'https://www.linkedin.com/sales/' },
]

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
const Cross = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export default function ProviderStatus() {
  const { localExt } = useApp()
  const providers = (localExt && localExt.providers) || null
  const on = providers ? PROVIDERS.filter((p) => providers[p.key]) : []
  const off = providers ? PROVIDERS.filter((p) => !providers[p.key]) : []

  return (
    <div className="provstat" role="group" aria-label="Enrichment source logins">
      <div className="provstat-head">
        <span className="provstat-title">Enrichment sources</span>
        {providers && <span className="provstat-count">{on.length}/{PROVIDERS.length} logged in</span>}
      </div>

      <div className="provstat-chips">
        {PROVIDERS.map((p) => {
          const state = !providers ? 'unknown' : (providers[p.key] ? 'on' : 'off')
          return (
            <a key={p.key} className={`provchip ${state}`} href={p.url} target="_blank" rel="noopener noreferrer"
              title={state === 'on' ? `${p.label} — logged in (click to open)` : state === 'off' ? `${p.label} — not logged in (click to log in)` : `${p.label} — click to log in`}>
              <span className="provchip-ic">{state === 'on' ? <Check /> : state === 'off' ? <Cross /> : '…'}</span>
              {p.label}
            </a>
          )
        })}
      </div>

      {providers && off.length > 0 && (
        <p className="provstat-hint">
          Not logged in: <strong>{off.map((p) => p.label).join(', ')}</strong>. A <strong>free account</strong> for each is enough — open the site in this browser and sign in to enrich.
        </p>
      )}
      {providers && off.length === 0 && (
        <p className="provstat-hint">All set — a <strong>free account</strong> for each source is all the scraper needs.</p>
      )}
      {!providers && (
        <p className="provstat-hint">Checking sign-in status… update the Coldcast extension if this doesn’t appear.</p>
      )}
    </div>
  )
}
