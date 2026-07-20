import { PLAYBOOKS } from '../../lib/playbooks.js'
import { IconFileLines, IconDownload } from '../../lib/icons.jsx'

// Free Playbook — a grid of downloadable playbooks (under the Services nav area).
// Entries come from src/lib/playbooks.js; each with a `url` gets a live download button,
// the rest show "Coming soon".
const fmtDate = (d) => {
  if (!d) return ''
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

function PlaybookCard({ pb }) {
  const ready = !!(pb.url && pb.url.trim())
  return (
    <div className={'pb-card' + (ready ? '' : ' pb-card-soon')}>
      <div className="pb-cover"><IconFileLines /></div>
      <div className="pb-body">
        {pb.tag && <span className="pb-tag">{pb.tag}</span>}
        {pb.emoji && <div className="pb-emoji">{pb.emoji}</div>}
        <h4 className="pb-title">{pb.title}</h4>
        <p className="pb-desc">{pb.desc}</p>
        {pb.updated && <span className="pb-date">Updated {fmtDate(pb.updated)}</span>}
        <div className="pb-foot">
          <span className="pb-fmt">{pb.format || 'PDF'}{pb.size ? ` · ${pb.size}` : ''}</span>
          {ready ? (
            <a
              className="btn btn-p pb-dl"
              href={pb.url}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              <IconDownload /> Download free
            </a>
          ) : (
            <span className="pb-soon">Coming soon</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FreePlaybook() {
  return (
    <div className="pb-page">
      <div className="phead">
        <span className="phead-ic"><IconFileLines /></span>
        <h2 className="phead-name">Free Playbook</h2>
      </div>

      <div className="pb-head">
        <h3>Free GTM playbooks</h3>
        <p>Battle-tested outbound playbooks — download any of them free, no strings attached.</p>
      </div>

      {PLAYBOOKS.length ? (
        <div className="pb-grid">
          {PLAYBOOKS.map((pb) => <PlaybookCard key={pb.id} pb={pb} />)}
        </div>
      ) : (
        <p className="pb-empty">No playbooks yet — check back soon.</p>
      )}
    </div>
  )
}
