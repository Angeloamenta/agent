import type { Payload } from 'payload'

import { envBool } from '../lib/env.js'
import { childLogger } from '../lib/logger.js'

const uniquePostSlug = async (payload: Payload, slug: string) => {
  const exists = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  if (exists.totalDocs === 0) return slug
  return `${slug}-${Date.now()}`
}

export const publishReadyDrafts = async (args: { payload: Payload; runId: string }) => {
  const log = childLogger({ runId: args.runId, unit: 'publisher' })
  const autoPublish = envBool('AUTO_PUBLISH', false)

  const drafts = await args.payload.find({
    collection: 'drafts',
    where: { status: { equals: 'ready' } },
    sort: '-updatedAt',
    limit: 10,
  })

  let created = 0
  let skipped = 0

  for (const draft of drafts.docs as any[]) {
    // idempotency: if a post already exists for this draft, skip
    const existing = await args.payload.find({
      collection: 'posts',
      where: { createdFromDraft: { equals: draft.id } },
      limit: 1,
    })
    if (existing.totalDocs > 0) {
      skipped++
      continue
    }

    const slug = await uniquePostSlug(args.payload, draft.slug)
    const status = autoPublish ? 'published' : 'draft'
    const publishedAt = autoPublish ? new Date().toISOString() : null

    await args.payload.create({
      collection: 'posts',
      data: {
        title: draft.title,
        slug,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        keywords: (draft.keywords || []).map((k: any) => ({ value: k.value })),
        content: draft.content,
        excerpt: draft.excerpt,
        coverImage: undefined,
        tags: [],
        status,
        publishedAt,
        createdFromDraft: draft.id,
      },
    })
    created++
  }

  log('info', 'publisher_complete', { created, skipped, considered: drafts.totalDocs, autoPublish })
  return { created, skipped, considered: drafts.totalDocs, autoPublish }
}
