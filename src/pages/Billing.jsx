import { useApp } from '../store/AppStore.jsx'
import { waLink } from '../lib/whatsapp.js'

const contact = (msg) => window.open(waLink(msg), '_blank', 'noopener,noreferrer')
// Optional Stripe Payment Link for the $3 / 10k scrape pack. When unset, the buy
// button falls back to the same WhatsApp-contact flow as the other packs (admin grants).
const SCRAPE_PACK_URL = import.meta.env.VITE_SCRAPE_PACK_URL || ''
const buyScrape = () => SCRAPE_PACK_URL
  ? window.open(SCRAPE_PACK_URL, '_blank', 'noopener,noreferrer')
  : contact('Hi! I’d like to buy 10,000 Coldcast scrape credits ($3).')

const IcBolt = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
const IcCheck = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>

// What one credit buys — the pay-per-use rate card.
const RATES = [
  { label: 'Email enrichment', sub: 'Name → verified work email', cost: '1 credit' },
  { label: 'Domain enrichment', sub: 'Company domain → full firmographics', cost: '3 credits' },
  { label: 'Email verification', sub: 'Syntax · MX · SMTP · catch-all', cost: '½ credit' },
]
const ENT = ['Higher rate limits', 'Volume credit discounts', 'Priority support', 'SLA & uptime guarantees', 'Unlimited team seats', 'Custom enrichment limits']

export default function Billing() {
  const { credits, usage, me } = useApp()
  // secondsLeft === null → time-expiry is off (pay-as-you-go): accounts never expire, so
  // don't derive "expired" from daysLeft<=0. Credits are the only gate.
  const noExpiry = me?.secondsLeft == null
  const secondsLeft = me?.secondsLeft ?? 0
  const daysLeft = secondsLeft > 0 ? Math.ceil(secondsLeft / 86400) : 0
  const expired = !noExpiry && !!(me?.user?.expired || daysLeft <= 0)
  const planName = me?.user?.trial ? 'Free trial' : 'Paid plan'

  const creditModel = !!usage?.creditModel
  const scrapeBalance = usage?.remaining ?? 0
  const creditBal = credits ?? 0

  return (
    <div className="bill">
      <div className="bill-head">
        <h2>Billing</h2>
        <p>Your scrape credits and enrichment wallet — top up any time, credits never expire.</p>
      </div>

      {/* ── Status ───────────────────────────────────────────── */}
      <div className="bill-status">
        <div className="bstat">
          <span className="bstat-l">Plan</span>
          <div className="bstat-v"><b className={expired ? 'warn' : ''}>{expired ? 'Expired' : (noExpiry ? 'Pay as you go' : planName)}</b></div>
          <span className="bstat-s">{expired ? 'Renew to run jobs again' : noExpiry ? 'Active · credits never expire' : daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Active'}</span>
        </div>

        <div className="bstat">
          <span className="bstat-l">Scrape credits</span>
          <div className="bstat-v"><b>{scrapeBalance.toLocaleString()}</b></div>
          <span className="bstat-s">{creditModel ? 'Prepaid · never expires' : 'Row allowance'}</span>
          <button className="btn btn-p btn-sm bstat-btn" onClick={buyScrape}>+ Buy credits</button>
        </div>

        <div className="bstat">
          <span className="bstat-l">Credits</span>
          <div className="bstat-v accent"><span className="bstat-ic"><IcBolt /></span><b>{creditBal.toLocaleString()}</b></div>
          <span className="bstat-s">Enrichment &amp; verification</span>
          <button className="btn btn-p btn-sm bstat-btn" onClick={() => contact('Hi! I’d like to top up my Coldcast credits.')}>+ Add credits</button>
        </div>
      </div>

      {/* ── Scraping credits ─────────────────────────────────── */}
      <h3 className="bill-sec">Scraping credits</h3>
      <div className="bill-scrape">
        <div className="bsc-main">
          <span className="bsc-tag">Pay as you go</span>
          <div className="bsc-price"><b>$3</b><em>/ 10,000 credits</em></div>
          <p>1 credit ≈ 1 scraped row (some scrapers cost a little more per row). Credits never expire and are shared across <b>every</b> scraper (Sales Nav, Apollo, ZoomInfo, LinkedIn & more). Enrichment included; verified emails via the waterfall.</p>
        </div>
        <ul className="bsc-feats">
          <li><IcCheck /> 10,000 credits for $3</li>
          <li><IcCheck /> ~10,000 rows (varies by scraper)</li>
          <li><IcCheck /> All scrapers included</li>
          <li><IcCheck /> Credits never expire</li>
        </ul>
        <div className="bsc-cta">
          <button className="btn btn-p" onClick={buyScrape}>Buy 10,000 — $3</button>
          <span className="bsc-note">{SCRAPE_PACK_URL ? 'Secure checkout via Stripe.' : 'No automated checkout yet — we top you up with you.'}</span>
        </div>
      </div>

      {/* ── Credit packs ─────────────────────────────────────── */}
      <h3 className="bill-sec">Credits</h3>
      <div className="bill-packs">
        <div className="bpack pop">
          <span className="bpack-tag">Enrichment credits</span>
          <div className="bpack-price"><b>$30</b><em>/ 1,000 credits</em></div>
          <div className="bpack-unit">$0.03 per credit</div>
          <ul className="bpack-feats">
            <li><IcCheck /> 1 credit · email enrichment</li>
            <li><IcCheck /> 3 credits · domain enrichment</li>
            <li><IcCheck /> ½ credit · email verification</li>
            <li><IcCheck /> Credits never expire</li>
          </ul>
          <button className="btn btn-p" onClick={() => contact('Hi! I’d like to buy 1,000 Coldcast credits ($30).')}>Buy credits</button>
        </div>
      </div>

      {/* ── Rates ────────────────────────────────────────────── */}
      <h3 className="bill-sec">What a credit buys</h3>
      <div className="bill-rates">
        {RATES.map((r) => (
          <div className="brate" key={r.label}>
            <div className="brate-l"><b>{r.label}</b><span>{r.sub}</span></div>
            <span className="brate-cost">{r.cost}</span>
          </div>
        ))}
      </div>

      {/* ── Enterprise ───────────────────────────────────────── */}
      <div className="bill-ent">
        <span className="bent-tag">Enterprise</span>
        <h3>Built for scale</h3>
        <p>Everything in the standard plan, plus higher limits and hands-on support for teams that need more.</p>
        <ul className="bent-feats">
          {ENT.map((f) => <li key={f}><IcCheck /> {f}</li>)}
        </ul>
        <button className="btn btn-p" onClick={() => contact('Hi! I’d like to talk about Coldcast Enterprise.')}>Talk to sales →</button>
      </div>

      <style>{`
        .bill{max-width:1080px}
        .bill-head{margin:2px 0 22px}
        .bill-head h2{font-size:24px;font-weight:800;letter-spacing:-.03em;color:var(--text)}
        .bill-head p{font-size:14px;color:var(--text-muted);margin-top:5px;line-height:1.5}

        .bill-status{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:34px}
        .bstat{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px 20px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:6px}
        .bstat-l{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-dim)}
        .bstat-v{display:flex;align-items:baseline;gap:7px}
        .bstat-v b{font-size:26px;font-weight:800;letter-spacing:-.02em;color:var(--text);font-variant-numeric:tabular-nums}
        .bstat-v b.warn{color:var(--red)}
        .bstat-v em{font-style:normal;font-size:13px;font-weight:600;color:var(--text-dim);font-variant-numeric:tabular-nums}
        .bstat-v.accent{align-items:center}
        .bstat-ic{width:26px;height:26px;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center}
        .bstat-ic svg{width:15px;height:15px}
        .bstat-track{height:5px;border-radius:99px;background:var(--bg-elev-3);overflow:hidden;margin-top:2px}
        .bstat-track i{display:block;height:100%;border-radius:99px;background:var(--accent);transition:width .4s ease}
        .bstat-s{font-size:11.5px;color:var(--text-dim);font-weight:500}
        .bstat-btn{align-self:flex-start;margin-top:6px}

        .bill-sec{font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-dim);margin:0 2px 14px}

        .bill-scrape{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-xl);box-shadow:var(--shadow-sm);padding:24px 26px;margin-bottom:34px;display:grid;grid-template-columns:1.4fr 1fr auto;gap:26px;align-items:center}
        .bsc-tag{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
        .bsc-price{display:flex;align-items:baseline;gap:6px;margin:8px 0 6px}
        .bsc-price b{font-size:34px;font-weight:800;letter-spacing:-.03em;color:var(--text)}
        .bsc-price em{font-style:normal;font-size:14px;color:var(--text-dim);font-weight:600}
        .bsc-main p{font-size:13px;color:var(--text-muted);line-height:1.55;margin:0}
        .bsc-feats{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
        .bsc-feats li,.bpack-feats li,.bent-feats li{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--text);font-weight:500}
        .bsc-feats li svg,.bpack-feats li svg,.bent-feats li svg{width:16px;height:16px;color:var(--green);flex-shrink:0}
        .bsc-cta{display:flex;flex-direction:column;gap:9px;align-items:flex-start;min-width:150px}
        .bsc-cta .btn{width:100%;justify-content:center}
        .bsc-note{font-size:11px;color:var(--text-dim);line-height:1.4}

        .bill-packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,360px));gap:16px;margin-bottom:34px;justify-content:start}
        .bpack{position:relative;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-xl);box-shadow:var(--shadow-sm);padding:24px 24px 22px;display:flex;flex-direction:column;gap:12px}
        .bpack.pop{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent), var(--shadow-md)}
        .bpack-pop{position:absolute;top:-11px;left:22px;background:var(--brand-grad);color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.03em;padding:4px 11px;border-radius:999px;box-shadow:var(--shadow-sm)}
        .bpack-tag{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
        .bpack-price{display:flex;align-items:baseline;gap:6px}
        .bpack-price b{font-size:30px;font-weight:800;letter-spacing:-.03em;color:var(--text)}
        .bpack-price em{font-style:normal;font-size:13px;color:var(--text-dim);font-weight:600}
        .bpack-unit{font-size:12px;color:var(--text-dim);font-weight:600;margin-top:-4px}
        .bpack-feats{list-style:none;margin:2px 0 4px;padding:0;display:flex;flex-direction:column;gap:9px;flex:1}
        .bpack .btn{width:100%;justify-content:center;margin-top:4px}

        .bill-rates{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden;margin-bottom:34px}
        .brate{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;border-top:1px solid var(--border)}
        .brate:first-child{border-top:none}
        .brate-l{display:flex;flex-direction:column;gap:2px}
        .brate-l b{font-size:14px;font-weight:700;color:var(--text)}
        .brate-l span{font-size:12px;color:var(--text-muted)}
        .brate-cost{font-size:13px;font-weight:700;color:var(--accent);background:var(--accent-soft);border:1px solid var(--accent-line);padding:5px 12px;border-radius:999px;white-space:nowrap}

        .bill-ent{position:relative;overflow:hidden;border:1px solid var(--accent-line);border-radius:var(--radius-xl);padding:28px 30px;background:linear-gradient(135deg,var(--accent-soft),rgba(99,102,241,.03))}
        .bent-tag{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
        .bill-ent h3{font-size:20px;font-weight:800;letter-spacing:-.02em;color:var(--text);margin:8px 0 6px}
        .bill-ent > p{font-size:13.5px;color:var(--text-muted);line-height:1.55;max-width:60ch;margin:0 0 18px}
        .bent-feats{list-style:none;margin:0 0 22px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:11px}

        @media (max-width:720px){
          .bill-scrape{grid-template-columns:1fr;gap:18px}
          .bsc-cta{min-width:0}
        }
      `}</style>
    </div>
  )
}
