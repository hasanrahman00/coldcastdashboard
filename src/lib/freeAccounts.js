import { getToken } from './api.js'

// Calls the dashboard's OWN serverless function (/api/free-account on the same
// origin), which talks to the Google Sheets server-side. The sheet credentials
// never reach the browser — this just hands back one account.
//   → { source, account, password }
export async function getFreeAccount(source) {
  const res = await fetch(`/api/free-account?source=${encodeURIComponent(source)}`, {
    headers: { Authorization: 'Bearer ' + getToken() },
  })
  let data = null
  try { data = await res.json() } catch { /* non-JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`)
  return data
}
