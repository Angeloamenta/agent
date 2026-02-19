import type { TaskConfig } from 'payload'

import { publishReadyDrafts } from '../agents/publisherAgent.js'
import { childLogger } from '../lib/logger.js'

export const publishPostTask = {
  slug: 'publishPost',
  label: 'Publish post',
  retries: 1,
  onFail: async ({ job, req }) => {
    const runId = (job?.input as any)?.runId
    const runDocId = (job?.input as any)?.runDocId
    if (!runDocId) return
    await req.payload.update({
      collection: 'automationRuns',
      id: runDocId,
      data: {
        status: 'failed',
        reason: `publishPost failed: ${job?.error || 'unknown error'}`,
        finishedAt: new Date().toISOString(),
      },
    })
    childLogger({ runId, unit: 'publishTask' })('error', 'task_failed', { error: job?.error })
  },
  inputSchema: [
    { name: 'runId', type: 'text', required: true },
    { name: 'runDocId', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'created', type: 'number' },
    { name: 'skipped', type: 'number' },
  ],
  handler: async ({ input, req }) => {
    if (!input) throw new Error('Missing input')
    const log = childLogger({ runId: input.runId, unit: 'publishTask' })
    const stats = await publishReadyDrafts({ payload: req.payload, runId: input.runId })

    const run = await req.payload.findByID({
      collection: 'automationRuns',
      id: input.runDocId,
    })

    await req.payload.update({
      collection: 'automationRuns',
      id: input.runDocId,
      data: {
        stats: {
          ...(run as any)?.stats,
          publisher: stats,
        },
      },
    })

    log('info', 'publish_task_done', stats)
    return { output: { created: stats.created, skipped: stats.skipped } }
  },
} as TaskConfig<'publishPost'>
