// ─────────────────────────────────────────────────────────────────────────────
//  api.js — the single place that knows how to talk to the backend.
//
//  The dashboard is hosted SEPARATELY from the API (cross-origin), so every URL
//  is prefixed with VITE_API_URL and auth travels as a Bearer token (read from
//  localStorage) — never cookies. SSE + file downloads can't send headers, so
//  for those the token rides in a ?token= query param (the server accepts both).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const apiUrl = (path) => BASE + path

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
}

// Thrown on HTTP 401 so the app can force a logout from one place.
export class AuthError extends Error {
  constructor(msg = 'Unauthorized') {
    super(msg)
    this.name = 'AuthError'
  }
}

async function request(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(apiUrl(path), { ...opts, headers })
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

const postJson = (path, body) =>
  asJson(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

const del = (path) => asJson(path, { method: 'DELETE' })

export const api = {
  base: BASE,

  // ── auth ───────────────────────────────────────────────────────────────
  login: (key) => postJson('/api/auth/login', { key }),
  me: () => asJson('/api/auth/me'),
  saveKey: (key) => postJson('/api/auth/key', { key }),
  // logout is fire-and-forget (keepalive) so it survives the redirect.
  logout: () => {
    const token = getToken()
    if (!token) return
    try {
      fetch(apiUrl('/api/auth/logout'), {
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

  // ── jobs ───────────────────────────────────────────────────────────────
  createJob: (payload) => postJson('/api/jobs', payload),
  startJob: (id) => postJson(`/api/jobs/${id}/start`),
  stopJob: (id) => postJson(`/api/jobs/${id}/stop`),
  deleteJob: (id) => del(`/api/jobs/${id}`),
  jobLogs: (id) => asJson(`/api/jobs/${id}/logs`),
  // download links open in a new tab → token in the query (no headers possible).
  downloadUrl: (id, fmt) =>
    apiUrl(`/api/jobs/${id}/${fmt}?token=${encodeURIComponent(getToken())}`),

  // ── profiles / extension status ────────────────────────────────────────
  agentStatus: () => asJson('/api/agent/status'),
  activateProfile: (id) => postJson(`/api/profiles/${encodeURIComponent(id)}/activate`),
  deleteProfile: (id) => del(`/api/profiles/${encodeURIComponent(id)}`),

  // ── live updates (Server-Sent Events) ──────────────────────────────────
  // EventSource can't set headers, so the token rides in the query string.
  events: () => new EventSource(apiUrl(`/api/events?token=${encodeURIComponent(getToken())}`)),
}
