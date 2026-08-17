import FreeAccountCard from '../components/FreeAccountCard.jsx'

// Setup — just the 3 data-source cards. Sign in to each (a free account is
// enough) and leads come back enriched. Reached via the account dropdown.
export default function Setup() {
  return (
    <div className="sbox">
      <div className="enrich-grid">
        <FreeAccountCard name="Lusha" source="lusha" />
        <FreeAccountCard name="SalesQL" source="salesql" warn="Sign up with your own Gmail — you need your own free account, then log in." />
        <FreeAccountCard name="ContactOut" source="contactout" warn="Sign up with your own Gmail — you need your own free account, then log in." />
      </div>
    </div>
  )
}
