import { useApp } from '../store/AppStore.jsx'

// "THIS browser" connection banner — driven by the extension's dashboard
// bridge (localExt), not the account-level profile list. Shows only when we
// KNOW the extension is installed in this browser and it isn't connected.
// When no bridge message ever arrived (extension missing or pre-bridge
// version) we can't tell anything — so we say nothing.
export default function LocalExtBanner() {
  const { localExt } = useApp()
  if (!localExt.installed || localExt.connected) return null

  const msg = !localExt.hasKey ? (
    <>
      The Coldcast extension in <b>this browser</b> isn&rsquo;t connected yet — click the
      extension icon in your toolbar and paste your API key.
    </>
  ) : localExt.authError ? (
    <>
      The extension in <b>this browser</b> can&rsquo;t connect: {localExt.authError}
    </>
  ) : (
    <>
      The extension in <b>this browser</b> is offline — click the Coldcast extension icon
      to reconnect.
    </>
  )

  return (
    <div className="localext-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>{msg}</span>
      <style>{`
        .localext-banner{display:flex;align-items:center;gap:10px;margin:0 0 18px;padding:11px 16px;border:1px solid rgba(180,83,9,.30);border-radius:var(--radius-lg);background:var(--amberglow);color:var(--amber);font-size:13px;line-height:1.45}
        .localext-banner svg{width:17px;height:17px;flex:none}
        .localext-banner b{font-weight:700}
      `}</style>
    </div>
  )
}
