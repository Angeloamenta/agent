import type { TaskConfig } from 'payload'

import { scrapeAndQueueSources } from '../agents/scraperAgent.js'
import { childLogger } from '../lib/logger.js'

export const scrapeSourcesTask = {
  slug: 'scrapeSources',
  label: 'Scrape sources',
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
        reason: `scrapeSources failed: ${job?.error || 'unknown error'}`,
        finishedAt: new Date().toISOString(),
      },
    })
    childLogger({ runId, unit: 'scrapeTask' })('error', 'task_failed', { error: job?.error })
  },
  inputSchema: [
    { name: 'runId', type: 'text', required: true },
    { name: 'runDocId', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'queued', type: 'number' },
    { name: 'deduped', type: 'number' },
    { name: 'rejected', type: 'number' },
    { name: 'discovered', type: 'number' },
  ],
  handler: async ({ input, req }) => {
    if (!input) throw new Error('Missing input')
    const log = childLogger({ runId: input.runId, unit: 'scrapeTask' })
    const stats = await scrapeAndQueueSources({
      payload: req.payload,
      runId: input.runId,
    })

    await req.payload.update({
      collection: 'automationRuns',
      id: input.runDocId,
      data: {
        stats: {
          scrape: stats,
        },
      },
    })

    log('info', 'scrape_task_done', stats)
    return {
      output: {
        queued: stats.queued,
        deduped: stats.deduped,
        rejected: stats.rejected,
        discovered: stats.discovered,
      },
    }
  },
} as TaskConfig<'scrapeSources'>
