import { SERVICES } from '../lib/services.js'

// "Done-for-you" — a dedicated page listing every service as a card. Reached from the
// sidebar's "Done-for-you" nav item; each card opens that service's own page.
const ArrowGo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const badgeCls = (s) => (s.deal ? 'deal' : s.badge === 'Free' ? 'free' : 'dfy')

export default function ServicesHome({ nav }) {
  return (
    <div className="thome">
      <div className="thome-hero">
        <span className="thome-eyebrow"><span className="d" />Done-for-you · we run it, you get the results</span>
        <h2>Done-for-you services</h2>
        <p>Hand off the heavy lifting — lead lists, cold-email infrastructure, and a full Sales Navigator deal — or grab a free resource.</p>
      </div>

      <section className="thome-sec">
        <div className="thome-grid">
          {SERVICES.map((s) => {
            const Icon = s.icon
            return (
              <button className="thome-card" key={s.id} onClick={() => nav(s.id)} aria-label={s.label}>
                <span className="thome-go"><ArrowGo /></span>
                <span className="thome-ic">{s.emoji || <Icon />}</span>
                <h4 className="thome-name">{s.label}</h4>
                <p className="thome-desc">{s.short}</p>
                <div className="thome-foot">
                  <span className={'thome-badge ' + badgeCls(s)}>{s.badge}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
