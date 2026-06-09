import { useState, useEffect } from 'react'
import { api, getSavedKey, setSavedKey } from '../lib/api.js'
import { useApp } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { IconKey, IconCopy } from '../lib/icons.jsx'

export default function ApiKey() {
  const { saveKey } = useApp()
  const toast = useToast()
  const [key, setKey] = useState(getSavedKey())
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  // Prefer the server's decrypted copy; fall back to the key saved at login.
  useEffect(() => {
    let alive = true
    api
      .me()
      .then((d) => {
        if (!alive) return
        if (d && d.key) {
          setKey(d.key)
          setSavedKey(d.key)
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const copy = () => {
    if (!key) return toast('No key to copy', 'err')
    navigator.clipboard
      ?.writeText(key)
      .then(() => toast('API key copied', 'ok'))
      .catch(() => toast('Copy failed — select it and copy manually', 'err'))
  }

  const save = async () => {
    const k = input.trim()
    if (!k) return toast('Paste your key first', 'err')
    setSaving(true)
    try {
      const d = await saveKey(k)
      const saved = (d && d.key) || k
      setSavedKey(saved)
      setKey(saved)
      setInput('')
      toast('Key saved', 'ok')
    } catch (e) {
      toast(e.message || "That key doesn't match your account", 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cc-card-in mx-auto max-w-2xl">
      <h2 className="text-xl font-extrabold tracking-tight text-ink">API key</h2>
      <p className="mt-1 text-sm text-muted">
        Paste this key into the Coldcast browser extension to connect your profile.
      </p>

      <div className="mt-5 rounded-2xl border border-line bg-card p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <IconKey className="h-4 w-4 text-brand" /> Your key
        </div>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-sm text-ink">
            {loading ? 'Loading…' : key || 'Key not saved yet'}
          </code>
          <button
            onClick={copy}
            disabled={!key || loading}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            <IconCopy className="h-4 w-4" /> Copy
          </button>
        </div>

        {!loading && !key && (
          <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4">
            <p className="text-sm text-muted">
              First time here? Paste your key once to save it to your account — then
              it shows here automatically, on any device.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your access key"
                className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
