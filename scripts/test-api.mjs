// Runs the REAL serverless handler (api/free-account.js) locally — no server,
// no vercel dev. It loads .env, calls the function with a mock request, and
// prints the response. This actually dispenses an account and marks it used in
// your sheet, so you can confirm the whole flow end-to-end.
//
//   node scripts/test-api.mjs lusha
//   node scripts/test-api.mjs salesql
//   node scripts/test-api.mjs contactout

import fs from 'fs'
import path from 'path'
import dns from 'dns'

// Use a public DNS resolver so the mongodb+srv:// SRV lookup works even on
// networks whose default resolver refuses it (querySrv ECONNREFUSED).
dns.setServers(['8.8.8.8', '1.1.1.1'])

// ── load .env BEFORE importing the handler (it reads process.env at load) ─────
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    const eq = s.indexOf('=')
    if (eq < 0) continue
    const k = s.slice(0, eq).trim()
    const v = s.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(k in process.env)) process.env[k] = v
  }
} else {
  console.error('No .env found — create it first.')
  process.exit(1)
}

// dynamic import AFTER env is loaded, so the handler sees the sheet ids
const { default: handler } = await import('../api/free-account.js')

const source = process.argv[2] || 'lusha'
const req = {
  method: 'GET',
  query: { source },
  headers: { authorization: 'Bearer local-test' }, // passes when FREE_ACCOUNT_ALLOW_INSECURE=1
}
let code = 200
const res = {
  status(c) { code = c; return this },
  json(obj) {
    console.log(`\nHTTP ${code}:`)
    console.log(JSON.stringify(obj, null, 2))
    if (code === 200) console.log('\n✅ Dispensed OK — check the sheet: that row now has a timestamp in column C.')
    return this
  },
}

await handler(req, res)
