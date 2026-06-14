import { IconChain } from '../lib/icons.jsx'

// Setup — onboarding guide for connecting the data sources Coldcast enriches
// from. Reached via the account dropdown (below Settings). Moved here out of
// Settings so the steps have their own clear, focused page.
export default function Setup() {
  return (
    <div className="sbox">
      <div className="sbox-h">
        <div className="sbox-ic">
          <IconChain />
        </div>
        <h3>Setup — connect your data sources</h3>
      </div>

      <p style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 13 }}>
        Coldcast enriches your leads using your own logged-in sessions — there are <b>no API keys to
        paste</b>. Just stay signed in to the sources below <b>in the same Chrome where the Coldcast
        extension is installed</b>.
      </p>

      <ol className="setup-steps">
        <li>
          <h4>Log into each source</h4>
          <p>Click a card below and sign in normally, using accounts you already have. You only do this once per source.</p>
        </li>
        <li>
          <h4>Use the same Chrome profile</h4>
          <p>Sign in in the <b>same Chrome profile</b> where the Coldcast extension runs, so it can reuse your session.</p>
        </li>
        <li>
          <h4>Run a job</h4>
          <p>When you export, Coldcast pulls emails, phone numbers, and company data from whichever sources you're signed in to. Not signed in to one? It's simply skipped.</p>
        </li>
      </ol>

      <div className="enrich-grid">
        <a className="enrich-card" href="https://www.lusha.com/login/" target="_blank" rel="noopener noreferrer">
          <div className="enrich-h">
            <b>Lusha</b>
            <span className="enrich-action">Open &amp; log in →</span>
          </div>
          <p>Verified business emails &amp; direct-dial phone numbers from your Lusha credits.</p>
        </a>
        <a className="enrich-card" href="https://salesql.com/" target="_blank" rel="noopener noreferrer">
          <div className="enrich-h">
            <b>SalesQL</b>
            <span className="enrich-action">Open &amp; log in →</span>
          </div>
          <p>Business email addresses &amp; company details for your leads.</p>
        </a>
        <a className="enrich-card" href="https://contactout.com/login" target="_blank" rel="noopener noreferrer">
          <div className="enrich-h">
            <b>ContactOut</b>
            <span className="enrich-action">Open &amp; log in →</span>
          </div>
          <p>Personal &amp; work emails plus phone numbers, when you're logged in.</p>
        </a>
      </div>
    </div>
  )
}
