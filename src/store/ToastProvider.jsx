import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { IconCheckCircle, IconWarn } from '../lib/icons.jsx'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  // show(message, 'ok' | 'err')
  const show = useCallback((msg, type = 'ok') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ msg, type })
    timer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 cc-pop">
          <div
            className={
              'flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg shadow-black/15 ' +
              (toast.type === 'err' ? 'bg-rose-600' : 'bg-slate-900')
            }
          >
            {toast.type === 'err' ? (
              <IconWarn className="w-4 h-4 shrink-0" />
            ) : (
              <IconCheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}
