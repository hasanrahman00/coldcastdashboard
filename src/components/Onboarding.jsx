import { useState, useEffect } from 'react'
import { useApp } from '../store/AppStore.jsx'
import { useToast } from '../store/ToastProvider.jsx'
import { api, getSavedKey, setSavedKey } from '../lib/api.js'
import { waLink } from '../lib/whatsapp.js'
import Modal from './Modal.jsx'
import {
  IconDownload, IconKeyOutline, IconChain,
  IconWhatsApp, IconPlay, IconGlobe,
} from '../lib/icons.jsx'

// Hosted .zip — same source as the Extension page. Kept in sync intentionally:
// both read VITE_EXT_DOWNLOAD_URL, falling back to the app's own /public copy.
const EXT_URL = import.meta.env.VITE_EXT_DOWNLOAD_URL || '/coldcast-extension.zip'

// A little green check for completed steps (no IconCheck in the set).
function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// One row of the vertical stepper. `state` = 'done' | 'active' | 'todo'.
function Step({ n, state, title, last, children }) {
  return (
    <li className={`onb-step is-${state}`}>
      <div className="onb-rail">
        <span className="onb-num">{state === 'done' ? <Check /> : n}</span>
        {!last && <span className="onb-line" />}
      </div>
      <div className="onb-body">
        <h4>{title}</h4>
        {children}
      </div>
    </li>
  )
}

// Full guided setup — everything a new user needs, in order, in one place.
// Auto-opens (from Dashboard) until the extension in THIS browser is connected;
// re-openable anytime from the account menu → "Setup guide".
export default function Onboarding({ open, onClose, nav }) {
  const { localExt } = useApp()
  const toast = useToast()
  const [key, setKey] = useState(getSavedKey())

  // Pull the real key once the modal opens (mirrors the API-key page).
  useEffect(() => {
    if (!open || key) return
    let alive = true
    api.me()
      .then((d) => { if (alive && d?.key) { setKey(d.key); setSavedKey(d.key) } })
      .catch(() => {})
    return () => { alive = false }
  }, [open, key])

  const installed = !!localExt.installed
  const connected = !!localExt.connected

  // Which step is the user on? Drives the accent highlight. Steps we can't
  // detect (platform login, enrichment) inherit "done" once connected.
  const activeId = !key ? 'account' : !installed ? 'install' : !connected ? 'connect' : 'done'
  const st = (id, done) => (done ? 'done' : activeId === id ? 'active' : 'todo')

  const copyKey = () => {
    if (!key) return toast('Key not loaded yet — open the API key tab', 'err')
    navigator.clipboard?.writeText(key)
      .then(() => toast('API key copied', 'ok'))
      .catch(() => toast('Copy failed — select it and copy manually', 'err'))
  }

  const go = (route) => { onClose(); nav(route) }

  const statusPill = connected
    ? <span className="onb-pill ok"><span className="onb-dot" />Connected in this browser</span>
    : <span className="onb-pill bad"><span className="onb-dot" />Not connected yet</span>

  return (
    <Modal open={open} onClose={onClose} title="Set up Coldcast" width={660} headerExtra={statusPill}>
      <div className="onb">
        <p className="onb-sub">
          Five minutes, start to finish. Follow the steps in order — this guide stays open until your
          extension is connected, and you can reopen it anytime from the account menu.
        </p>

        <ol className="onb-steps">
          {/* 1 — Account & API key */}
          <Step n={1} state={st('account', !!key)} title="Your account & API key">
            <p>
              You’re signed in, so your key is ready. This one key is your login <em>and</em> your
              extension connector — keep it private.
            </p>
            <div className="onb-key">
              <code className="onb-key-val">{key || 'Loading your key…'}</code>
              <button className="btn btn-p" onClick={copyKey} disabled={!key}>Copy</button>
            </div>
            <p className="onb-muted">
              Want to upgrade to a paid plan? There’s no automated checkout —{' '}
              <a href={waLink('Hi! I’d like to upgrade my Coldcast account.')} target="_blank" rel="noopener noreferrer">
                message me on WhatsApp
              </a>{' '}and I’ll activate the best plan for you.
            </p>
          </Step>

          {/* 2 — Download & install the extension */}
          <Step n={2} state={st('install', installed)} title="Download & install the extension">
            <p>Download the extension, unzip it, and load it into Chrome.</p>
            <a
              className="btn btn-p onb-dl"
              href={EXT_URL}
              download="coldcast-extension.zip"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconDownload /> Download extension (.zip)
            </a>
            <ol className="onb-mini">
              <li>Right-click the downloaded <b>.zip</b> → <b>Extract All</b>. Keep the folder somewhere
                permanent (deleting it removes the extension).</li>
              <li>Open <code>chrome://extensions</code> and turn on <b>Developer mode</b> (top-right).</li>
              <li>Click <b>Load unpacked</b> and pick the extracted folder (the one with{' '}
                <code>manifest.json</code> directly inside).</li>
              <li>Pin the Coldcast icon to your toolbar from the puzzle-piece menu.</li>
            </ol>
            {installed && <p className="onb-ok">✓ Extension detected in this browser.</p>}
          </Step>

          {/* 3 — Log into the platform */}
          <Step n={3} state={st('login', connected)} title="Log in to the platform you’ll scrape">
            <p>
              In <b>this same browser</b>, open and sign in to whatever you’ll scrape —{' '}
              <IconGlobe /> Sales Navigator, Apollo, or ZoomInfo. The extension scrapes through your own
              logged-in session, so the tab has to be signed in and ready.
            </p>
          </Step>

          {/* 4 — Connect the extension */}
          <Step n={4} state={st('connect', connected)} title="Connect the extension">
            <p>
              Click the Coldcast icon, paste your API key (from step 1) into the box, and hit{' '}
              <b>Connect</b>. Your profile is auto-detected once it’s linked.
            </p>
            <div className="onb-actions">
              <button className="btn btn-g" onClick={copyKey} disabled={!key}>
                <IconKeyOutline /> Copy key again
              </button>
              <button className="btn btn-g" onClick={() => go('api')}>Open API key page</button>
            </div>
            {connected
              ? <p className="onb-ok">✓ Connected — jobs will run in this browser.</p>
              : <p className="onb-muted">This box turns green automatically the moment the extension connects.</p>}
          </Step>

          {/* 5 — Enrichment providers */}
          <Step n={5} state={st('enrich', connected)} title="Turn on free contact data (Lusha · SalesQL · ContactOut)">
            <p>
              Coldcast pulls emails and phones for free through three providers. Log in to all three in{' '}
              <b>this browser</b> — Lusha (grab a free account on the Setup page), plus SalesQL and
              ContactOut with any free Gmail.
            </p>
            <div className="onb-actions">
              <button className="btn btn-p" onClick={() => go('setup')}>
                <IconChain /> Open Setup & connect providers
              </button>
            </div>
          </Step>

          {/* 6 — First job */}
          <Step n={6} state={st('launch', false)} title="Launch your first job" last>
            <p>
              Pick a scraper, click <b>New Job</b>, name your list, and paste a search URL. Choose{' '}
              <b>Fast</b> mode for speed (up to ~10k rows/hr) or <b>Normal</b> for deep buying-signal data.
              Pause anytime — it resumes exactly where it left off, no duplicates.
            </p>
            <div className="onb-actions">
              <button className="btn btn-p" onClick={() => go('salesnav')} disabled={!connected}>
                <IconPlay /> Go to Sales Navigator
              </button>
            </div>
            {!connected && <p className="onb-muted">Connect the extension first (step 4) to start a job.</p>}
          </Step>
        </ol>

        <div className="onb-foot">
          <a className="onb-help" href={waLink('Hi! I need help setting up Coldcast.')} target="_blank" rel="noopener noreferrer">
            <IconWhatsApp /> Stuck? Message me on WhatsApp
          </a>
          <button className="btn btn-g" onClick={onClose}>
            {connected ? 'Done' : 'I’ll finish later'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
