import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  // show(message, 'ok' | 'err' | 'info', ms?) — ms overrides the auto-dismiss (default 3.5s);
  // pass a longer value for actionable messages (e.g. "sign in to Lusha, then start").
  const show = useCallback((msg, type = 'ok', ms = 3500) => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ msg, type })
    timer.current = setTimeout(() => setToast(null), Math.max(1500, ms || 3500))
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.type} show`}>{toast.msg}</div>}
    </ToastCtx.Provider>
  )
}
