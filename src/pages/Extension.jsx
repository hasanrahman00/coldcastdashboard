import { IconPuzzle, IconDownload } from '../lib/icons.jsx'

// Hosted .zip for the Chrome extension. Served straight from this app's own
// /public folder (Vercel), so there's no Google Drive wrapper-folder nesting and
// no cache/version dance — to ship an update, drop a new public/coldcast-extension.zip
// and push. VITE_EXT_DOWNLOAD_URL still overrides if you ever want to host elsewhere.
const EXT_URL =
  import.meta.env.VITE_EXT_DOWNLOAD_URL ||
  '/coldcast-extension.zip'

export default function Extension() {
  return (
    <div className="sbox">
      <div className="sbox-h">
        <div className="sbox-ic">
          <IconPuzzle />
        </div>
        <h3>Browser extension</h3>
      </div>
      <p>
        Install the Coldcast extension in Chrome, then connect it with your API key (see the{' '}
        <b>API key</b> tab).
      </p>

      {EXT_URL ? (
        <a
          className="btn btn-p"
          href={EXT_URL}
          download="coldcast-extension.zip"
          target="_blank"
          rel="noopener noreferrer"
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', gap: 8 }}
        >
          <IconDownload />
          Download extension (.zip)
        </a>
      ) : (
        <span
          className="btn btn-p"
          title="Download link not set yet (VITE_EXT_DOWNLOAD_URL)"
          style={{
            width: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            opacity: 0.55,
            cursor: 'default',
            pointerEvents: 'none',
          }}
        >
          <IconDownload />
          Download link not set yet
        </span>
      )}

      <ol className="setup-steps" style={{ marginTop: 20 }}>
        <li>
          <h4>Download &amp; unzip</h4>
          <p>
            Download the .zip above, right-click it and choose <b>Extract All</b>. You'll get a single
            folder with <code>manifest.json</code> directly inside — keep it somewhere permanent
            (deleting the folder removes the extension from Chrome).
          </p>
        </li>
        <li>
          <h4>Open Chrome extensions</h4>
          <p>
            Go to <code>chrome://extensions</code> and turn on <b>Developer mode</b> (top-right toggle).
          </p>
        </li>
        <li>
          <h4>Load it</h4>
          <p>
            Click <b>Load unpacked</b> and select the folder you just extracted — the one with{' '}
            <code>manifest.json</code> directly inside it.
          </p>
        </li>
        <li>
          <h4>Connect</h4>
          <p>
            Click the Coldcast icon (pin it from the puzzle-piece menu), paste your <b>API key</b> from
            the API tab, and hit <b>Save</b>.
          </p>
        </li>
      </ol>
    </div>
  )
}
