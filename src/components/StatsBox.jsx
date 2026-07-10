import { useApp, ENRICH_ACTIVE } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { getSavedKey } from '../lib/api.js'
import { IconGrid, IconPlay, IconDownload, IconCopy } from '../lib/icons.jsx'

export default function StatsBox({ nav }) {
  const { jobs, apolloJobs, enricherJobs, companyJobs, profiles, connectorOnline, activeProfileId, enrichUploads } = useApp()
  const toast = useToast()

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

  // connection slot (mirrors updateProfileSlot)
  const online = profiles.filter((p) => p.online)
  const active = profiles.find((p) => p.id === activeProfileId) || online[0]
  let connClass = 'sbx-conn bad'
  let dotClass = 'sbx-conn-dot off'
  let connText = 'No profile — set up'
  if (connectorOnline && online.length) {
    connClass = 'sbx-conn ok'
    dotClass = 'sbx-conn-dot on'
    connText = active?.name || `${online.length} connected`
  } else if (profiles.length) {
    connText = 'Not connected'
  }

  const savedKey = getSavedKey()
  const keyShort = savedKey
    ? savedKey.length > 22
      ? savedKey.slice(0, 8) + '…' + savedKey.slice(-6)
      : savedKey
    : 'Open API key →'

  const copyTopKey = () => {
    if (!savedKey) return nav('api')
    navigator.clipboard
      ?.writeText(savedKey)
      .then(() => toast('API key copied', 'ok'))
      .catch(() => toast('Copy failed — open the API key page', 'err'))
  }

  return (
    <div className="statsbox">
      <div className="sbx-stats">
        <div className="sbx-stat b">
          <span className="sbx-ic"><IconGrid /></span>
          <div className="sbx-stat-txt">
            <div className="l">Total Jobs</div>
            <div className="v">{totalJobs}</div>
          </div>
        </div>
        <div className="sbx-divider" />
        <div className="sbx-stat pr">
          <span className="sbx-ic"><IconPlay /></span>
          <div className="sbx-stat-txt">
            <div className="l">Running</div>
            <div className="v">{running}</div>
          </div>
        </div>
      </div>

      <div className={connClass} onClick={() => nav('set')} title="Manage profiles & connection">
        <span className={dotClass} />
        <div className="sbx-conn-txt">
          <div className="sbx-conn-l">Profile</div>
          <div className="sbx-conn-v">{connText}</div>
        </div>
      </div>

      <button className="sbx-ext" onClick={() => nav('ext')} title="Download & install the Coldcast extension">
        <IconDownload />
        Get extension
      </button>

      <div className="sbx-key">
        <span className="kl">API key</span>
        <span className="kv" onClick={copyTopKey} title="Copy API key">
          {keyShort}
        </span>
        <button className="kc" onClick={copyTopKey} title="Copy API key">
          <IconCopy />
        </button>
      </div>
    </div>
  )
}
