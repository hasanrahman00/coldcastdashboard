import { IconPuzzle, IconDownload } from '../lib/icons.jsx'

// Chrome Web Store listing for the Coldcast extension. Auto-updates, no unpacking.
// Overridable per-env via VITE_EXT_STORE_URL.
const EXT_URL =
  import.meta.env.VITE_EXT_STORE_URL ||
  'https://chromewebstore.google.com/detail/bljolejpindiokpikdpalhofcbiphfoi'

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

      <a
        className="btn btn-p"
        href={EXT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', gap: 8 }}
      >
        <IconDownload />
        Add to Chrome
      </a>

      <ol className="setup-steps" style={{ marginTop: 20 }}>
        <li>
          <h4>Add to Chrome</h4>
          <p>
            Open the Web Store listing above and click <b>Add to Chrome</b> → <b>Add extension</b>. It
            installs in seconds and updates itself automatically.
          </p>
        </li>
        <li>
          <h4>Pin it</h4>
          <p>
            Click the puzzle-piece menu in Chrome's toolbar and pin <b>Coldcast</b> so its icon stays
            visible.
          </p>
        </li>
        <li>
          <h4>Connect</h4>
          <p>
            Click the Coldcast icon, paste your <b>API key</b> from the API tab, and hit <b>Save</b>.
          </p>
        </li>
      </ol>
    </div>
  )
}
