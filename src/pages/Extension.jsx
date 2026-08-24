import { useState, useEffect } from 'react'
import { api, getSavedKey, setSavedKey } from '../lib/api.js'
import { useToast } from '../store/ToastProvider.jsx'
import { IconPuzzle } from '../lib/icons.jsx'

// Chrome Web Store listing for the Coldcast extension. Auto-updates, no unpacking.
const EXT_URL =
  import.meta.env.VITE_EXT_STORE_URL ||
  'https://chromewebstore.google.com/detail/bljolejpindiokpikdpalhofcbiphfoi'

const IcDownload = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
const IcCopy = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>

export default function Extension() {
  const toast = useToast()
  const [key, setKey] = useState(getSavedKey())

  useEffect(() => {
    let alive = true
    api.me().then((d) => { if (alive && d && d.key) { setKey(d.key); setSavedKey(d.key) } }).catch(() => {})
    return () => { alive = false }
  }, [])

  const copyKey = () => {
    if (!key) return toast('No key yet — open the API key tab', 'err')
    navigator.clipboard?.writeText(key)
      .then(() => toast('API key copied', 'ok'))
      .catch(() => toast('Copy failed — select it and copy manually', 'err'))
  }

  return (
    <div className="sbox">
      <div className="sbox-h">
        <div className="sbox-ic"><IconPuzzle /></div>
        <h3>Connect the extension</h3>
      </div>
      <p>
        Jobs run in <b>your own browser</b> through the Coldcast extension — install it once, then link it to
        your workspace with your API key. Takes about a minute.
      </p>

      <a className="xt-cta" href={EXT_URL} target="_blank" rel="noopener noreferrer">
        <IcDownload /> Add to Chrome
      </a>

      <ol className="xt-steps">
        <li className="xt-step">
          <span className="xt-num">1</span>
          <div className="xt-body">
            <h4>Install</h4>
            <p>Open the Chrome Web Store listing above and click <b>Add to Chrome</b> → <b>Add extension</b>. It installs in seconds and updates itself automatically.</p>
          </div>
        </li>

        <li className="xt-step">
          <span className="xt-num">2</span>
          <div className="xt-body">
            <h4>Pin it</h4>
            <p>Click the puzzle-piece icon in Chrome’s toolbar and pin <b>Coldcast</b> so its icon stays visible.</p>
          </div>
        </li>

        <li className="xt-step">
          <span className="xt-num">3</span>
          <div className="xt-body">
            <h4>Connect with your API key</h4>
            <p>Click the Coldcast icon to open it, paste the key below, and hit <b>Save</b>. This links this browser to your workspace — wait for it to show <b>“connected.”</b></p>
            <div className="xt-key">
              <code className="xt-key-val">{key || 'Open the API key tab to generate your key'}</code>
              <button className="xt-key-copy" onClick={copyKey} disabled={!key} title="Copy API key">
                <IcCopy /> Copy
              </button>
            </div>
          </div>
        </li>
      </ol>

      <div className="xt-note">
        <span className="xt-note-ic">!</span>
        <span>Keep your API key private — anyone with it can connect to your workspace. A job runs only in the browser you start it from, so connect the browser you’ll scrape in.</span>
      </div>

      <style>{`
        .xt-cta{display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 20px;border-radius:var(--radius);font-family:var(--font-nav);font-size:14.5px;font-weight:700;letter-spacing:-.005em;color:#fff;background:var(--brand-grad);border:none;text-decoration:none;box-shadow:0 8px 20px -8px rgba(99,102,241,.6);transition:transform .15s var(--ease-out),box-shadow .15s;margin-bottom:8px}
        .xt-cta:hover{transform:translateY(-1px);box-shadow:0 12px 26px -8px rgba(99,102,241,.7)}
        .xt-cta svg{width:18px;height:18px}

        .xt-steps{list-style:none;margin:22px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}
        .xt-step{display:flex;gap:14px;align-items:flex-start;background:var(--bg-elev-1);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 18px;transition:border-color .15s,box-shadow .15s}
        .xt-step:hover{border-color:var(--border-strong);box-shadow:var(--shadow-sm)}
        .xt-num{flex-shrink:0;width:26px;height:26px;border-radius:999px;background:var(--brand-grad);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;margin-top:1px;box-shadow:0 2px 8px -2px rgba(99,102,241,.6)}
        .xt-body{min-width:0;flex:1}
        .xt-body h4{font-size:14.5px;font-weight:700;letter-spacing:-.01em;color:var(--text);margin:0 0 3px}
        .xt-body p{font-size:13px;line-height:1.55;color:var(--text-muted);margin:0}
        .xt-body b{color:var(--text);font-weight:700}

        .xt-key{display:flex;align-items:stretch;gap:8px;margin-top:12px}
        .xt-key-val{flex:1;min-width:0;display:flex;align-items:center;padding:10px 13px;background:var(--bg);border:1px solid var(--border-strong);border-radius:var(--radius);font-family:var(--mono);font-size:12.5px;color:var(--text);word-break:break-all;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .xt-key-copy{display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:var(--radius);background:var(--brand-grad);color:#fff;border:none;font-family:var(--font-nav);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:filter .15s,transform .15s}
        .xt-key-copy:hover{filter:brightness(1.05);transform:translateY(-1px)}
        .xt-key-copy:disabled{opacity:.5;cursor:not-allowed;transform:none;filter:none}
        .xt-key-copy svg{width:15px;height:15px}

        .xt-note{display:flex;gap:11px;align-items:flex-start;margin-top:18px;padding:13px 16px;border-radius:var(--radius-lg);background:var(--accent-soft);border:1px solid var(--accent-line);font-size:12.5px;line-height:1.55;color:var(--text-muted)}
        .xt-note b{color:var(--text)}
        .xt-note-ic{flex-shrink:0;width:20px;height:20px;border-radius:999px;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800}
      `}</style>
    </div>
  )
}
