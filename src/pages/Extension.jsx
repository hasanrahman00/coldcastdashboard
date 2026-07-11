import { IconPuzzle, IconDownload } from '../lib/icons.jsx'

// Hosted .zip link for the Chrome extension. VITE_EXT_DOWNLOAD_URL overrides; otherwise
// this Drive default is used so the download always works.
const EXT_URL =
  import.meta.env.VITE_EXT_DOWNLOAD_URL ||
  'https://drive.google.com/uc?export=download&id=1r7ecqTynS6SFoVRq3yqbCFHjPdwan8Lh'

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
            Download the .zip above and extract it. You'll get a folder named <code>Coldcast</code> —
            keep it somewhere permanent.
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
            Click <b>Load unpacked</b> and select the <code>Coldcast</code> folder you extracted.
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
