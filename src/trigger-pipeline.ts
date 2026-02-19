import { loadEnv } from './lib/loadEnv.js'

loadEnv()

import { envStr } from './lib/env.js'

const base = envStr('PIPELINE_TRIGGER_URL', 'http://localhost:3000')
const secret = process.env.CRON_SECRET

if (!secret) {
  throw new Error('Missing CRON_SECRET')
}

const url = new URL('/api/internal/run-pipeline', base).toString()

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'x-cron-secret': secret,
  },
})

const body = await res.json().catch(() => null)
if (!res.ok) {
  throw new Error(`Trigger failed (${res.status}): ${JSON.stringify(body)}`)
}

// eslint-disable-next-line no-console
console.log(JSON.stringify(body))
