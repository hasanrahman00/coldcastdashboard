// Listens for state messages from the Coldcast extension's dashboard-bridge
// content script (injected on this origin by the extension installed in THIS
// browser profile). Gives the UI a "this browser" view the account-level
// /api/profiles poll can't provide: whether the extension is installed here,
// has an API key saved, and is currently connected.
//
// LIVE, no hard refresh: the extension usually connects AFTER this page is
// already open (the user saves the API key in the popup). Its content script
// doesn't reliably push a fresh state to an already-open tab, so we (re)ask for
// it — once now, on a short interval while the tab is visible, AND whenever the
// tab regains focus/visibility (e.g. right after the popup closes). The moment
// the extension flips to connected, `localExt` updates and every consumer — the
// per-page connection banner, the New Job button, and the top-nav pill — updates
// with it. A hard refresh already worked (it re-issued this one request); now the
// dashboard re-issues it on its own.
//
// If the extension isn't installed (or is an older version without the bridge),
// no message ever arrives and `installed` stays false — callers should treat that
// as "unknown" and stay quiet rather than claim anything.
export function subscribeLocalExtension(cb) {
  // Dedupe: the poll re-requests state every few seconds, but the content script
  // answers with the SAME state until something actually changes. Only push to
  // React when the state differs, so a steady poll never churns re-renders.
  let last = ''
  const onMsg = (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'coldcast-ext') return
    if (e.data.type !== 'state' || !e.data.state) return
    let key
    try { key = JSON.stringify(e.data.state) } catch { key = '' }
    if (key && key === last) return
    last = key
    cb({ installed: true, ...e.data.state })
  }
  window.addEventListener('message', onMsg)

  const request = () => {
    try { window.postMessage({ source: 'coldcast-page', type: 'get-state' }, window.location.origin) } catch { /* not postMessage-capable — ignore */ }
  }

  request() // ask immediately (covers the content script loading before us)

  // Re-ask on a short cadence while visible — this is what flips the UI to
  // "connected" live after the user saves their API key in the extension popup.
  const poll = setInterval(() => { if (!document.hidden) request() }, 2500)

  // And re-ask the instant the tab regains focus/visibility — e.g. the moment the
  // extension popup closes and the dashboard tab is frontmost again → feels instant.
  const onVisible = () => { if (!document.hidden) request() }
  window.addEventListener('focus', onVisible)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.removeEventListener('message', onMsg)
    clearInterval(poll)
    window.removeEventListener('focus', onVisible)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
