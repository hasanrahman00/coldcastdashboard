import { IconChain } from '../lib/icons.jsx'
import FreeAccountCard from '../components/FreeAccountCard.jsx'

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
        We use 3 sources to find extra data for your leads. Log in to all 3 below to get the best results.
      </p>

      <ol className="setup-steps">
        <li>
          <h4>Sign in to all 3 sources</h4>
          <p>Open the cards below and log in to each one. You only need to do this once.</p>
        </li>
        <li>
          <h4>Run your export</h4>
          <p>Your leads come back enriched automatically.</p>
        </li>
      </ol>

      <div className="enrich-grid">
        <FreeAccountCard name="Lusha" source="lusha" />
        <FreeAccountCard name="SalesQL" source="salesql" />
        <FreeAccountCard name="ContactOut" source="contactout" />
      </div>
    </div>
  )
}
