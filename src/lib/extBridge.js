// Listens for state messages from the Coldcast extension's dashboard-bridge
// content script (injected on this origin by the extension installed in THIS
// browser profile). Gives the UI a "this browser" view the account-level
// /api/profiles poll can't provide: whether the extension is installed here,
// has an API key saved, and is currently connected.
//
// If the extension isn't installed (or is an older version without the
// bridge), no message ever arrives and `installed` stays false — callers
// should treat that as "unknown" and stay quiet rather than claim anything.
export function subscribeLocalExtension(cb) {
  const onMsg = (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'coldcast-ext') return
    if (e.data.type === 'state' && e.data.state) cb({ installed: true, ...e.data.state })
  }
  window.addEventListener('message', onMsg)
  // Ask for the current state in case the content script loaded before us.
  window.postMessage({ source: 'coldcast-page', type: 'get-state' }, window.location.origin)
  return () => window.removeEventListener('message', onMsg)
}
