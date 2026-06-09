import { useEffect } from 'react'

// Reproduces the original .ov / .md modal. Overlay-click or Esc closes.
export default function Modal({ open, onClose, title, headerExtra, children, width }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ov on"
      onClick={(e) => {
        if (e.target.classList.contains('ov')) onClose()
      }}
    >
      <div className="md" style={width ? { width } : undefined}>
        <div className="md-h">
          <h3>{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {headerExtra}
            <button className="md-x" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>
        <div className="md-b">{children}</div>
      </div>
    </div>
  )
}
