import { useState, useEffect, useRef } from 'react'
import Modal from '../../components/Modal.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { IconCopy } from '../../lib/icons.jsx'

// matches renderLines() in the original
function lineClass(l) {
  if (l.includes('[ERR]') || l.includes('ERROR')) return 'err'
  if (l.includes('✅') || l.includes('Generated')) return 'ok'
  if (l.includes('📄') || l.includes('🔥') || l.includes('═══')) return 'info'
  if (l.includes('⚠️')) return 'warn'
  return ''
}

export default function LogsModal({ job, onClose }) {
  const { jobLogs } = useApp()
  const toast = useToast()
  const [lines, setLines] = useState([])
  const boxRef = useRef(null)
  const open = !!job

  useEffect(() => {
    if (!open) return
    let alive = true
    const load = async () => {
      try {
        const d = await jobLogs(job.id)
        if (alive) setLines(d?.logs || [])
      } catch {
        /* ignore transient errors while polling */
      }
    }
    load()
    const t = setInterval(load, 2000)
    return () => {
      alive = false
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.id])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  const copyLogs = () => {
    const text = (boxRef.current?.innerText || '').trim()
    if (!text || text === 'No logs yet.') return toast('No logs to copy', 'err')
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast('Logs copied', 'ok'))
      .catch(() => toast('Copy failed', 'err'))
  }

  const copyBtn = (
    <button className="btn btn-g btn-sm" onClick={copyLogs}>
      <IconCopy /> Copy
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} width="720px" title={job ? `Logs — ${job.name}` : 'Job Logs'} headerExtra={copyBtn}>
      <div className="log-box" ref={boxRef}>
        {lines.length ? (
          lines.map((l, i) => (
            <div key={i} className={lineClass(l)}>
              {l}
            </div>
          ))
        ) : (
          <div style={{ color: 'var(--text-faint)' }}>No logs yet.</div>
        )}
      </div>
    </Modal>
  )
}
