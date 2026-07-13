import { useApp } from '../store/AppStore.jsx'

// Per-scraper "this browser" connection status, shown at the top of every scraper
// page. A job here runs ONLY in the browser you're sitting in, so this tells you —
// before you create a job — whether THAT browser is connected to THIS scraper.
// Auto-updates: the store refreshes it live from the extension's dashboard bridge
// (on connect/disconnect/profile change) plus the 8s poll and window focus.
//
// `scraper` = key in SCRAPER_HOSTS (salesnav | apollo | company | enricher).
export default function ScraperConnection({ scraper, name }) {
  const { scraperConnected, localProfileName, localExt } = useApp()
  const connected = scraperConnected(scraper)

  if (connected) {
    return (
      <div className="conn-status ok" role="status">
        <span className="conn-dot" />
        <span>
          Connected — jobs run in <strong>this browser</strong>
          {localProfileName ? ` (${localProfileName})` : ''}.
        </span>
      </div>
    )
  }

  const installed = !!(localExt && localExt.installed)
  return (
    <div className="conn-status bad" role="status">
      <span className="conn-dot" />
      <span>
        {installed
          ? <>This browser isn’t connected to <strong>{name}</strong>. Open the Coldcast extension here and wait for “connected” — a job runs only in the browser you start it from.</>
          : <>Connect the Coldcast extension <strong>in this browser</strong> to run {name} jobs.</>}
      </span>
    </div>
  )
}
