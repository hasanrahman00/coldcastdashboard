import FreeAccountCard from '../components/FreeAccountCard.jsx'

// Setup — just the 3 data-source cards. Sign in to each (a free account is
// enough) and leads come back enriched. Reached via the account dropdown.
export default function Setup() {
  return (
    <div className="sbox">
      <div className="enrich-grid">
        <FreeAccountCard name="Lusha" source="lusha" />
        <FreeAccountCard name="SalesQL" source="salesql" />
        <FreeAccountCard name="ContactOut" source="contactout" />
      </div>
    </div>
  )
}
