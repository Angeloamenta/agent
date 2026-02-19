import { loadEnv } from './lib/loadEnv.js'

loadEnv()

import { envInt, envStr } from './lib/env.js'
import { log } from './lib/logger.js'
import { sleep } from './lib/sleep.js'

const queue = envStr('WORKER_QUEUE', 'pipeline')
const limit = envInt('WORKER_LIMIT', 5)
const pollMs = envInt('WORKER_POLL_MS', 3000)

let stopping = false
const stop = () => {
  stopping = true
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

const main = async () => {
  const { getPayloadClient } = await import('./payload/getPayloadClient.js')
  const payload = await getPayloadClient()
  log({ level: 'info', msg: 'worker_started', queue, limit, pollMs })

  while (!stopping) {
    try {
      const result = await payload.jobs.run({ queue: queue || 'pipeline', limit })
      const ran = Array.isArray((result as any)?.jobs)
        ? (result as any).jobs.length
        : Array.isArray(result)
          ? result.length
          : 0
      if (ran > 0) {
        log({ level: 'info', msg: 'worker_ran_jobs', queue, ran })
        continue
      }
    } catch (e) {
      log({ level: 'error', msg: 'worker_error', queue, error: (e as Error).message })
    }

    await sleep(pollMs)
  }

  log({ level: 'info', msg: 'worker_stopped' })
}

await main()
