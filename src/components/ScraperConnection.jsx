import { useApp } from '../store/AppStore.jsx'

// Per-scraper "this browser" connection status, shown at the top of every scraper
// page. A job here runs ONLY in the browser you're sitting in, so this tells you —
// before you create a job — whether THAT browser is connected to THIS scraper.
// Auto-updates: the store refreshes it live from the extension's dashboard bridge
// (on connect/disconnect/profile change) plus the 8s poll and window focus.
//
// `scraper` = key in SCRAPER_HOSTS (salesnav | apollo | company | enricher).
export default function ScraperConnection({ scraper, name }) {
  const { scraperConnected, localProfileName, localExt, localAccountMismatch, expired } = useApp()
  const connected = scraperConnected(scraper)

  // Account expired → read-only. This wins over connection state (it's WHY New Job / Run are
  // disabled), so the page says so instead of a misleading "not connected".
  if (expired) {
    return (
      <div className="conn-status warn" role="status">
        <span className="conn-dot" />
        <span>
          Your Coldcast account has <strong>expired</strong>. You can still view your data — renew to run {name} jobs again.
        </span>
      </div>
    )
  }

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

  // The extension IS connected in this browser, but under a DIFFERENT Coldcast account
  // than the one logged in here. Show a distinct, actionable message — never the green
  // "connected" (the old bug) and never the plain "not connected" (which misleads too).
  if (localAccountMismatch) {
    return (
      <div className="conn-status warn" role="status">
        <span className="conn-dot" />
        <span>
          This browser’s extension is signed in with a <strong>different Coldcast account</strong>.
          Open the Coldcast extension here, paste <strong>this</strong> account’s API key, and wait for “connected”.
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
