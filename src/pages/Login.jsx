import { useState } from 'react'
import { api } from '../lib/api.js'
import { useToast } from '../store/ToastProvider.jsx'
import { IconKey } from '../lib/icons.jsx'

export default function Login({ onLogin }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const k = key.trim()
    if (!k) return toast('Enter your access key', 'err')
    setBusy(true)
    try {
      const resp = await api.login(k)
      onLogin(resp, k)
    } catch (err) {
      toast(err.message || 'Login failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="cc-card-in w-full max-w-sm">
        {/* brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M16 8.5a5 5 0 1 0 0 7" />
            </svg>
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Coldcast</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your dashboard</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-line bg-card p-6 shadow-sm"
        >
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Access key
          </label>
          <div className="relative">
            <IconKey className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="password"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your key"
              className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-xs text-faint">
            Don't have a key? Contact your administrator.
          </p>
        </form>
      </div>
    </div>
  )
}
