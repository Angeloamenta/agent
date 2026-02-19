import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/payload/getPayloadClient.js'

export const runtime = 'nodejs'

export const POST = async (req: Request) => {
  const expected = process.env.CRON_SECRET
  const provided = req.headers.get('x-cron-secret')

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await getPayloadClient()
  const runId = crypto.randomUUID()

  const job = await payload.jobs.queue({
    workflow: 'runPipeline',
    queue: process.env.WORKER_QUEUE || 'pipeline',
    input: {
      runId,
    },
  })

  return NextResponse.json({ runId, jobId: job.id })
}
