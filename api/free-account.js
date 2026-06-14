// ─────────────────────────────────────────────────────────────────────────────
//  api/free-account.js — Vercel serverless function (runs SERVER-SIDE). Hands out
//  one unused free account from MongoDB for the requested source, atomically marks
//  it used, and resets the marks when a source runs out.
//
//  Storage: a `freeAccounts` collection — { source, account, password, used, usedAt }.
//  Load it with:  node scripts/import-accounts.mjs <source> <csv-path>
//
//  The claim is ATOMIC (findOneAndUpdate), so two simultaneous users can never get
//  the same account — the weakness the Google-Sheets version had.
//
//  GET /api/free-account?source=lusha|salesql|contactout → { source, account, password }
// ─────────────────────────────────────────────────────────────────────────────

import { MongoClient } from 'mongodb'
import dns from 'dns'

// Local dev (vercel dev / node) may sit on a network that can't do the SRV
// lookup mongodb+srv:// needs (querySrv ECONNREFUSED) — force a public resolver
// there. On deployed Vercel, leave the platform's own resolver alone.
if (process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_ENV !== 'preview') {
  try { dns.setServers(['8.8.8.8', '1.1.1.1']) } catch {}
}

// Each source is its OWN collection in the cold_cast_free_accounts database:
// "lusha", "salesql", "contactout". `source` is whitelisted below, so it's safe
// to use directly as the collection name.
const SOURCES = new Set(['lusha', 'salesql', 'contactout'])

// Cache the client across warm serverless invocations to avoid connection storms.
let cached = global._freeAccountsMongo
if (!cached) cached = global._freeAccountsMongo = { promise: null }

async function getDb() {
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI not set')
    cached.promise = new MongoClient(uri, { maxPoolSize: 5 }).connect()
  }
  const client = await cached.promise
  return client.db(process.env.MONGODB_DB || 'cold_cast_free_accounts')
}

// Only logged-in Coldcast users can pull accounts. Validate the Bearer token
// against the scraper backend's /api/auth/me. FAIL-CLOSED: if BACKEND_URL isn't
// set we DENY — unless FREE_ACCOUNT_ALLOW_INSECURE=1 (local dev only).
async function isAuthorized(req) {
  const auth = req.headers.authorization || ''
  if (!/^Bearer\s+/i.test(auth)) { console.warn('[free-account] denied: no Bearer token on request'); return false }
  const backend = process.env.BACKEND_URL
  if (!backend) {
    if (process.env.FREE_ACCOUNT_ALLOW_INSECURE === '1') return true
    console.warn('[free-account] denied: BACKEND_URL not set (and FREE_ACCOUNT_ALLOW_INSECURE != 1)')
    return false
  }
  try {
    const r = await fetch(backend.replace(/\/$/, '') + '/api/auth/me', { headers: { Authorization: auth } })
    if (!r.ok) console.warn('[free-account] denied: backend /api/auth/me returned', r.status)
    return r.ok
  } catch (e) {
    console.warn('[free-account] denied: auth-check fetch failed —', (e && e.message) || e)
    return false
  }
}

// Atomically claim a RANDOM unused account for the source. $sample picks a random
// candidate; findOneAndUpdate({used:false}) claims it only if still free, so a
// lost race just retries with another candidate. Returns the doc, or null if none.
async function claim(col) {
  // Available = anything not marked "used" (covers "available", empty, or missing).
  const AVAILABLE = { account: { $exists: true, $ne: '' }, status: { $ne: 'used' } }
  for (let attempt = 0; attempt < 5; attempt++) {
    const cand = await col
      .aggregate([{ $match: AVAILABLE }, { $sample: { size: 1 } }, { $project: { _id: 1 } }])
      .toArray()
    if (!cand.length) return null
    const doc = await col.findOneAndUpdate(
      { _id: cand[0]._id, status: { $ne: 'used' } },
      { $set: { status: 'used' } },
      { returnDocument: 'after' },
    )
    if (doc) return doc
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const source = String((req.query && req.query.source) || '').toLowerCase()
  if (!SOURCES.has(source)) return res.status(400).json({ error: 'Unknown source' })

  if (!(await isAuthorized(req))) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const col = (await getDb()).collection(source)
    let doc = await claim(col)

    // Exhausted → reset the used flags for this collection, then claim again.
    if (!doc) {
      const reset = await col.updateMany({}, { $set: { status: 'available' } })
      if (reset.matchedCount > 0) doc = await claim(col)
    }

    if (!doc) return res.status(404).json({ error: 'No accounts available' })
    return res.status(200).json({ source, account: doc.account, password: doc.password || '' })
  } catch (e) {
    // Log the real reason server-side; generic message to the client.
    console.error('[free-account]', (e && e.stack) || e)
    return res.status(500).json({ error: 'Could not fetch an account right now' })
  }
}
