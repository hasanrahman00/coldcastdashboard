import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { IconSettings, IconKey, IconPower, IconClock } from '../lib/icons.jsx'

function fmtTtl(secs) {
  if (secs <= 0) return 'Expired'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d >= 1) return `${d}d ${h}h left`
  if (h >= 1) return `${h}h ${m}m left`
  if (m >= 1) return `${m}m ${s}s left`
  return `${s}s left`
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white shadow-sm shadow-brand/30">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M16 8.5a5 5 0 1 0 0 7" />
        </svg>
      </span>
      <span className="text-[17px] font-extrabold tracking-tight text-ink">
        Coldcast
      </span>
    </div>
  )
}

export default function Topbar({ route, nav, onLogout }) {
  const { me, uiConfig } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const username = me?.user?.username || 'Account'
  const secondsLeft = me?.secondsLeft ?? 0
  const ttlDays = secondsLeft / 86400
  const ttlClass =
    ttlDays <= 1 ? 'text-rose-600' : ttlDays <= 7 ? 'text-amber-600' : 'text-muted'

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-[58px] w-full max-w-[1180px] items-center justify-between px-5 sm:px-7">
        <Logo />

        <div className="relative" ref={ref}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-3 transition hover:border-brand/40 hover:shadow-sm"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-[13px] font-bold text-brand">
              {(username[0] || '?').toUpperCase()}
            </span>
            <span className="hidden text-sm font-semibold text-ink sm:block">
              {username}
            </span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-faint" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {open && (
            <div className="cc-pop absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-black/10">
              <div className="border-b border-line px-4 py-3">
                <div className="text-sm font-bold text-ink">{username}</div>
                <div className={'mt-0.5 flex items-center gap-1 text-xs font-medium ' + ttlClass}>
                  <IconClock className="h-3.5 w-3.5" />
                  {fmtTtl(secondsLeft)}
                </div>
              </div>
              {!uiConfig.hideSettings && (
                <MenuItem icon={IconSettings} label="Settings" active={route === 'settings'} onClick={() => { setOpen(false); nav('settings') }} />
              )}
              <MenuItem icon={IconKey} label="API key" active={route === 'api'} onClick={() => { setOpen(false); nav('api') }} />
              <div className="my-1 border-t border-line" />
              <MenuItem icon={IconPower} label="Sign out" danger onClick={() => { setOpen(false); onLogout() }} />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuItem({ icon: Icon, label, onClick, active, danger }) {
  return (
    <button
      onClick={onClick}
      className={
        'flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition ' +
        (danger
          ? 'text-rose-600 hover:bg-rose-50'
          : active
            ? 'bg-brand/5 text-brand'
            : 'text-ink hover:bg-slate-50')
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
