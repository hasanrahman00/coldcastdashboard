import { useState, useEffect } from 'react'
import { api, getSavedKey, setSavedKey } from '../lib/api.js'
import { useApp } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { IconKeyOutline } from '../lib/icons.jsx'

export default function ApiKey() {
  const { saveKey } = useApp()
  const toast = useToast()
  const [key, setKey] = useState(getSavedKey())
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .me()
      .then((d) => {
        if (alive && d && d.key) {
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

  const noKey = !loading && !key

  return (
    <div className="sbox">
      <div className="sbox-h">
        <div className="sbox-ic">
          <IconKeyOutline />
        </div>
        <h3>Your API key</h3>
      </div>
      <p>
        This key connects the Coldcast browser extension to your workspace. Copy it, open the extension
        (popup or sidebar), paste it, and click <b>Save</b>.
      </p>

      <div className="key-box">
        <div className="key-val">{loading ? 'Loading…' : key || 'Key not saved yet'}</div>
        <button className="btn btn-p" onClick={copy} disabled={!key || loading}>
          Copy
        </button>
      </div>

      {noKey && (
        <>
          <p className="setup-note" style={{ marginTop: 12 }}>
            First time here? Paste your key below once to save it to your account — then it shows here
            automatically, on any device.
          </p>
          <div style={{ display: 'flex', marginTop: 10, gap: 10, alignItems: 'stretch' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your key here to save it"
              autoComplete="off"
              spellCheck="false"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '12px 14px',
                background: 'var(--bg)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                color: 'var(--text)',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              className="btn btn-p"
              onClick={save}
              disabled={saving}
              style={{ width: 'auto', padding: '0 22px', whiteSpace: 'nowrap' }}
            >
              {saving ? 'Saving…' : 'Save key'}
            </button>
          </div>
        </>
      )}

      <div className="help-cta" style={{ marginTop: 16 }}>
        <div className="help-ic">!</div>
        <div>
          Keep this key private — anyone who has it can connect to your workspace. New to the extension?
          Use the <b>Get extension</b> button at the top to install it.
        </div>
      </div>
    </div>
  )
}
