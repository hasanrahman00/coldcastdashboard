import { useApp, ENRICH_ACTIVE } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { getSavedKey } from '../lib/api.js'
import { IconGrid, IconPlay, IconDownload, IconCopy } from '../lib/icons.jsx'

export default function StatsBox({ nav }) {
  const { jobs, profiles, connectorOnline, activeProfileId, enrichUploads } = useApp()
  const toast = useToast()

  // Jobs + Running span BOTH products: scrape jobs and Waterfall enrich uploads.
  const enrichJobs = Object.values(enrichUploads || {})
  const totalJobs = jobs.length + enrichJobs.length
  const running =
    jobs.filter((j) => j.status === 'running').length +
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
          <div className="l">
            <IconGrid />
            Total Jobs
          </div>
          <div className="v">{totalJobs}</div>
        </div>
        <div className="sbx-divider" />
        <div className="sbx-stat pr">
          <div className="l">
            <IconPlay />
            Running
          </div>
          <div className="v">{running}</div>
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
