// ─────────────────────────────────────────────────────────────────────────────
//  api.js — the single place that knows how to talk to the backend.
//
//  The dashboard is hosted SEPARATELY from the API (cross-origin), so every URL
//  is prefixed with VITE_SALESNAV_SCRAPER_URL and auth travels as a Bearer token (read from
//  localStorage) — never cookies. SSE + file downloads can't send headers, so
//  for those the token rides in a ?token= query param (the server accepts both).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_SALESNAV_SCRAPER_URL || '').replace(/\/$/, '')
// Coldcast Core owns auth + billing + admin (shared by every product). The
// dashboard calls Core directly for those; product calls (jobs/profiles) stay on
// BASE (the scraper). If VITE_CORE_URL is unset, CORE_BASE falls back to BASE so
// the old single-host setup keeps working unchanged — set it to flip auth to Core.
const CORE_BASE = (import.meta.env.VITE_CORE_URL || '').replace(/\/$/, '') || BASE

export const apiUrl = (path) => BASE + path
export const coreUrl = (path) => CORE_BASE + path

// ── token + key storage (same localStorage keys the old dashboard used) ──────
const TOKEN_KEY = 'vk_token'
const KEY_KEY = 'vk_key'
const ME_KEY = 'vk_me'
export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t || '')
export const getSavedKey = () => localStorage.getItem(KEY_KEY) || ''
export const setSavedKey = (k) => localStorage.setItem(KEY_KEY, k || '')

// Cache the last-known session so a refresh — or a transient backend hiccup —
// doesn't bounce a logged-in user to login. secondsLeft is recomputed from the
// stored expiresAt on every read so it never goes stale.
export const setCachedMe = (m) => {
  try { localStorage.setItem(ME_KEY, JSON.stringify(m)) } catch { /* quota */ }
}
export const getCachedMe = () => {
  try {
    const m = JSON.parse(localStorage.getItem(ME_KEY) || 'null')
    if (m && m.expiresAt) {
      m.secondsLeft = Math.max(0, Math.floor((new Date(m.expiresAt).getTime() - Date.now()) / 1000))
    }
    return m
  } catch { return null }
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(KEY_KEY)
  localStorage.removeItem(ME_KEY)
  // Also drop the admin session (in-memory + sessionStorage) so the NEXT user in this tab
  // can't inherit a previous admin's access. 'cc_admin_pw' matches Admin.jsx's PW_KEY.
  setAdminPassword('')
  try { sessionStorage.removeItem('cc_admin_pw') } catch { /* ignore */ }
}

// Thrown on HTTP 401 so the app can force a logout from one place.
export class AuthError extends Error {
  constructor(msg = 'Unauthorized') {
    super(msg)
    this.name = 'AuthError'
  }
}

async function request(path, opts = {}) {
  const { base = BASE, ...rest } = opts
  const headers = { ...(rest.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(base + path, { ...rest, headers })
  if (res.status === 401) throw new AuthError()
  return res
}

// Parse JSON + surface { error } as a thrown Error so callers can try/catch.
async function asJson(path, opts) {
  const res = await request(path, opts)
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty / non-JSON body */
  }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`)
  return data
}

const postJson = (path, body, opts = {}) =>
  asJson(path, {
    ...opts,
    method: 'POST',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  })

const del = (path, opts = {}) => asJson(path, { ...opts, method: 'DELETE' })

export const api = {
  base: BASE,

  // ── auth (Core owns identity — these go to CORE_BASE) ────────────────────
  login: (key) => postJson('/api/auth/login', { key }, { base: CORE_BASE }),
  me: () => asJson('/api/auth/me', { base: CORE_BASE }),
  saveKey: (key) => postJson('/api/auth/key', { key }, { base: CORE_BASE }),
  // logout is fire-and-forget (keepalive) so it survives the redirect.
  logout: () => {
    const token = getToken()
    if (!token) return
    try {
      fetch(coreUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        keepalive: true,
      })
    } catch {
      /* ignore */
    }
  },

  // ── config ─────────────────────────────────────────────────────────────
  uiConfig: () => asJson('/api/ui-config'),

  // ── public self-serve 1-day trial (no auth) ─────────────────────────────
  // → { ok, username, key, expiresAt, trialDays }
  trial: (payload) => postJson('/api/trial', payload, { base: CORE_BASE }),

  // ── jobs ───────────────────────────────────────────────────────────────
  createJob: (payload) => postJson('/api/jobs', payload),
  // "Add to existing list" — point a list at a new search; its next run appends.
  appendJob: (id, payload) => postJson(`/api/jobs/${encodeURIComponent(id)}/append`, payload),
  startJob: (id) => postJson(`/api/jobs/${id}/start`),
  stopJob: (id) => postJson(`/api/jobs/${id}/stop`),
  deleteJob: (id) => del(`/api/jobs/${id}`),
  jobLogs: (id) => asJson(`/api/jobs/${id}/logs`),
  // download links open in a new tab → token in the query (no headers possible).
  downloadUrl: (id, fmt) =>
    apiUrl(`/api/jobs/${id}/${fmt}?token=${encodeURIComponent(getToken())}`),
  // Fetch a finished job's leads CSV as a File (Bearer header, bytes into JS) so it
  // can be POSTed to Core's enrich proxy — unlike downloadUrl which is a tab nav.
  jobCsvBlob: async (id) => {
    const res = await request(`/api/jobs/${id}/csv`) // scraper BASE + Bearer; 401 → AuthError
    if (!res.ok) throw new Error(`Could not fetch leads (${res.status})`)
    const blob = await res.blob()
    return new File([blob], `job-${id}.csv`, { type: 'text/csv' })
  },

  // ── profiles / extension status ────────────────────────────────────────
  agentStatus: () => asJson('/api/agent/status'),
  activateProfile: (id) => postJson(`/api/profiles/${encodeURIComponent(id)}/activate`),
  renameProfile: (id, name) => postJson(`/api/profiles/${encodeURIComponent(id)}`, { name }),
  deleteProfile: (id) => del(`/api/profiles/${encodeURIComponent(id)}`),

  // ── live updates (Server-Sent Events) ──────────────────────────────────
  // EventSource can't set headers, so the token rides in the query string.
  events: () => new EventSource(apiUrl(`/api/events?token=${encodeURIComponent(getToken())}`)),

  // ── email enricher (Core proxies the job to the enricher engine) ─────────
  // Core checks/reserves credits, forwards the file, and bills as valids resolve.
  enrichStart: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return asJson('/api/enrich/start', { base: CORE_BASE, method: 'POST', body: fd })
  },
  enrichStatus: (id) => asJson(`/api/enrich/jobs/${encodeURIComponent(id)}`, { base: CORE_BASE }),
  // Server-side, per-user enrich job history (cross-device — Core filters by the token's user).
  enrichList: () => asJson('/api/enrich/jobs', { base: CORE_BASE }),
  enrichDelete: (id) => del(`/api/enrich/jobs/${encodeURIComponent(id)}`, { base: CORE_BASE }),
  // Opened as a link → token rides in the query (Core's requireAuth accepts ?token=).
  enrichDownloadUrl: (id, type = 'valid', fmt = 'csv') =>
    coreUrl(`/api/enrich/download/${encodeURIComponent(id)}?type=${type}&format=${fmt}&token=${encodeURIComponent(getToken())}`),
  // Live credit wallet (persisted − in-flight usage) for the header/credit pill.
  creditsBalance: () => asJson('/api/credits/balance', { base: CORE_BASE }),
}

// ─────────────────────────────────────────────────────────────────────────────
//  Admin client — a SEPARATE auth scheme from the user app: every call carries
//  an X-Admin-Password header (matched against ADMIN_PASSWORD on the server),
//  not the user Bearer token. The password is held in memory (set by the Admin
//  page from sessionStorage), never sent anywhere but this header.
// ─────────────────────────────────────────────────────────────────────────────
let adminPw = ''
export const setAdminPassword = (pw) => { adminPw = pw || '' }

// Admin endpoints live on Core too (centralized user management).
async function adminReq(path, opts = {}) {
  const headers = { ...(opts.headers || {}), 'X-Admin-Password': adminPw }
  const res = await fetch(coreUrl(path), { ...opts, headers })
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (res.status === 403) throw new Error((data && data.error) || 'Wrong admin password')
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`)
  return data
}

const adminPost = (path, body) =>
  adminReq(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })

export const admin = {
  setPassword: setAdminPassword,
  listUsers: () => adminReq('/api/auth/users'),
  register: (payload) => adminPost('/api/auth/register', payload), // → { user, key }
  extend: (id, days) => adminPost(`/api/auth/users/${encodeURIComponent(id)}/extend`, { days }),
  renew: (id, days) => adminPost(`/api/auth/users/${encodeURIComponent(id)}/renew`, { days }),
  setDisabled: (id, disabled) => adminPost(`/api/auth/users/${encodeURIComponent(id)}/disable`, { disabled }),
  setLimit: (id, limit) => adminPost(`/api/auth/users/${encodeURIComponent(id)}/scrape-limit`, { limit }),
  setPlan: (id, plan) => adminPost(`/api/auth/users/${encodeURIComponent(id)}/plan`, { plan }), // 'free' | 'paid'
  setCredits: (id, credits) => adminPost(`/api/auth/users/${encodeURIComponent(id)}/credits`, { credits }),
  remove: (id) => adminReq(`/api/auth/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
