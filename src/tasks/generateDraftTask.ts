import type { TaskConfig } from 'payload'

import { generateDraftsFromQueuedSources } from '../agents/writerAgent.js'
import { childLogger } from '../lib/logger.js'

export const generateDraftTask = {
  slug: 'generateDraft',
  label: 'Generate draft',
  retries: 2,
  onFail: async ({ job, req }) => {
    const runId = (job?.input as any)?.runId
    const runDocId = (job?.input as any)?.runDocId
    if (!runDocId) return
    await req.payload.update({
      collection: 'automationRuns',
      id: runDocId,
      data: {
        status: 'failed',
        reason: `generateDraft failed: ${job?.error || 'unknown error'}`,
        finishedAt: new Date().toISOString(),
      },
    })
    childLogger({ runId, unit: 'writerTask' })('error', 'task_failed', { error: job?.error })
  },
  inputSchema: [
    { name: 'runId', type: 'text', required: true },
    { name: 'runDocId', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'created', type: 'number' },
    { name: 'rejected', type: 'number' },
    { name: 'considered', type: 'number' },
  ],
  handler: async ({ input, req }) => {
    if (!input) throw new Error('Missing input')
    const log = childLogger({ runId: input.runId, unit: 'writerTask' })
    const stats = await generateDraftsFromQueuedSources({
      payload: req.payload,
      runId: input.runId,
    })

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
          writer: stats,
        },
      },
    })

    log('info', 'writer_task_done', stats)
    return { output: stats }
  },
} as TaskConfig<'generateDraft'>
