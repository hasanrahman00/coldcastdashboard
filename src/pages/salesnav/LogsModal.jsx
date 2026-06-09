import { useState, useEffect, useRef } from 'react'
import Modal from '../../components/Modal.jsx'
import { useApp } from '../../store/AppStore.jsx'
import { useToast } from '../../store/ToastProvider.jsx'
import { IconCopy } from '../../lib/icons.jsx'

function lineClass(l) {
  if (l.includes('[ERR]') || l.includes('ERROR')) return 'text-rose-400'
  if (l.includes('✅') || l.includes('Generated')) return 'text-emerald-400'
  if (l.includes('📄') || l.includes('🔥') || l.includes('═══')) return 'text-sky-300'
  if (l.includes('⚠️')) return 'text-amber-300'
  return 'text-slate-300'
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

  // autoscroll to bottom on new lines
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  const copy = () => {
    const text = lines.join('\n').trim()
    if (!text) return toast('No logs to copy', 'err')
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast('Logs copied', 'ok'))
      .catch(() => toast('Copy failed', 'err'))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={job ? `Logs — ${job.name}` : 'Logs'}
      footer={
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-100"
        >
          <IconCopy className="h-4 w-4" /> Copy logs
        </button>
      }
    >
      <div
        ref={boxRef}
        className="cc-scroll h-[55vh] overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed"
      >
        {lines.length ? (
          lines.map((l, i) => (
            <div key={i} className={lineClass(l)}>
              {l}
            </div>
          ))
        ) : (
          <div className="text-slate-500">No logs yet.</div>
        )}
      </div>
    </Modal>
  )
}
