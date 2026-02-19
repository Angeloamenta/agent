import type { TaskConfig } from 'payload'

import { envInt } from '../lib/env.js'
import { childLogger } from '../lib/logger.js'

const hoursBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 36e5

export const gatePipelineTask = {
  slug: 'gatePipeline',
  label: 'Gate pipeline',
  retries: 0,
  inputSchema: [
    {
      name: 'runId',
      type: 'text',
      required: true,
    },
  ],
  outputSchema: [
    { name: 'shouldRun', type: 'checkbox', required: true },
    { name: 'runDocId', type: 'text', required: true },
    { name: 'reason', type: 'text' },
  ],
  handler: async ({ input, req }) => {
    if (!input) throw new Error('Missing input')
    const runId = input.runId
    const log = childLogger({ runId, unit: 'gate' })

    const startedAt = new Date().toISOString()
    const runDoc = await req.payload.create({
      collection: 'automationRuns',
      data: {
        runId,
        startedAt,
        status: 'running',
      },
    })

    const minHours = envInt('PIPELINE_MIN_HOURS', 48)
    const maxHours = envInt('PIPELINE_MAX_HOURS', 72)

    const lastSuccess = await req.payload.find({
      collection: 'automationRuns',
      where: { status: { equals: 'success' } },
      sort: '-finishedAt',
      limit: 1,
    })

    if (lastSuccess.totalDocs > 0) {
      const finishedAt = (lastSuccess.docs as any[])[0]?.finishedAt
      if (finishedAt) {
        const delta = hoursBetween(new Date(finishedAt), new Date())
        if (delta < minHours) {
          const reason = `skipped: last success ${delta.toFixed(1)}h ago (< ${minHours}h)`
          await req.payload.update({
            collection: 'automationRuns',
            id: runDoc.id,
            data: {
              status: 'skipped',
              reason,
              finishedAt: new Date().toISOString(),
            },
          })
          log('info', 'gated_skip', { minHours, maxHours, deltaHours: delta })
          return {
            output: {
              shouldRun: false,
              runDocId: runDoc.id,
              reason,
            },
          }
        }

        // Between min and max: probabilistic gating so daily cron results in 48-72h cadence.
        if (delta >= minHours && delta < maxHours) {
          const progress = (delta - minHours) / Math.max(1, maxHours - minHours)
          const roll = Math.random()
          if (roll > progress) {
            const reason = `skipped: within window (${minHours}-${maxHours}h), roll=${roll.toFixed(3)} > p=${progress.toFixed(3)}`
            await req.payload.update({
              collection: 'automationRuns',
              id: runDoc.id,
              data: {
                status: 'skipped',
                reason,
                finishedAt: new Date().toISOString(),
              },
            })
            log('info', 'gated_skip_window', {
              minHours,
              maxHours,
              deltaHours: delta,
              p: progress,
              roll,
            })
            return {
              output: {
                shouldRun: false,
                runDocId: runDoc.id,
                reason,
              },
            }
          }
        }
      }
    }

    const reason = `allowed: >= ${minHours}h since last success (max window ${maxHours}h)`
    log('info', 'gated_allow', { minHours, maxHours })
    return {
      output: {
        shouldRun: true,
        runDocId: runDoc.id,
        reason,
      },
    }
  },
} as TaskConfig<'gatePipeline'>
