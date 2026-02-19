import type { WorkflowConfig } from 'payload'
import { JobCancelledError } from 'payload'

import { childLogger } from '../lib/logger.js'

export const runPipelineWorkflow = {
  slug: 'runPipeline',
  label: 'Run pipeline',
  queue: 'pipeline',
  retries: 1,
  concurrency: {
    key: () => 'pipeline',
    exclusive: true,
    supersedes: false,
  },
  inputSchema: [
    {
      name: 'runId',
      type: 'text',
      required: true,
    },
  ],
  handler: async ({ job, tasks, req }) => {
    const runId = (job.input as any)?.runId as string
    const log = childLogger({ runId, unit: 'workflow' })

    const gateRes = await tasks.gatePipeline('gate', {
      input: {
        runId,
      },
    })

    const gateOut =
      (gateRes as any)?.output || (job as any)?.taskStatus?.gatePipeline?.gate?.output

    if (!gateOut) {
      throw new Error('gatePipeline did not produce output')
    }

    if (!gateOut.shouldRun) {
      log('info', 'workflow_skipped', { reason: gateOut.reason })
      // Cancel retrying the whole job when skipping is intentional.
      throw new JobCancelledError(gateOut.reason || 'skipped by gate')
    }

    const runDocId = gateOut.runDocId as string

    const scrapeRes = await tasks.scrapeSources('scrape', {
      input: { runId, runDocId },
    })

    const scrapeOut =
      (scrapeRes as any)?.output || (job as any)?.taskStatus?.scrapeSources?.scrape?.output

    const writerRes = await tasks.generateDraft('writer', {
      input: { runId, runDocId },
    })

    const writerOut =
      (writerRes as any)?.output || (job as any)?.taskStatus?.generateDraft?.writer?.output

    const publishRes = await tasks.publishPost('publisher', {
      input: { runId, runDocId },
    })

    const publishOut =
      (publishRes as any)?.output || (job as any)?.taskStatus?.publishPost?.publisher?.output

    await req.payload.update({
      collection: 'automationRuns',
      id: runDocId,
      data: {
        status: 'success',
        finishedAt: new Date().toISOString(),
        stats: {
          scrape: scrapeOut,
          writer: writerOut,
          publisher: publishOut,
        },
      },
    })

    log('info', 'workflow_success', {
      scrape: scrapeOut,
      writer: writerOut,
      publisher: publishOut,
    })
  },
} as WorkflowConfig<'runPipeline'>
