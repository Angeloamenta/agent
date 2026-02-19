import type { Payload } from 'payload'

import { envInt } from '../lib/env.js'
import { markdownToLexical } from '../lib/lexical.js'
import { childLogger } from '../lib/logger.js'
import { makeSlug } from '../lib/slug.js'
import { generateDraft } from '../lib/llm/provider.js'

const toneOfVoice =
  'Agenzia creativa minimal, design-forward, tecnica ma chiara. Italiano naturale, niente fuffa. '

const uniqueSlug = async (payload: Payload, base: string) => {
  let slug = base
  for (let i = 0; i < 10; i++) {
    const existsInDrafts = await payload.find({
      collection: 'drafts',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    const existsInPosts = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
    })

    if (existsInDrafts.totalDocs === 0 && existsInPosts.totalDocs === 0) return slug
    slug = `${base}-${i + 2}`
  }
  return `${base}-${Date.now()}`
}

export const generateDraftsFromQueuedSources = async (args: {
  payload: Payload
  runId: string
  limit?: number
}) => {
  const log = childLogger({ runId: args.runId, unit: 'writer' })
  const limit = args.limit ?? envInt('WRITER_SOURCE_LIMIT', 3)

  const queued = await args.payload.find({
    collection: 'sources',
    where: { status: { equals: 'queued' } },
    sort: '-createdAt',
    limit,
  })

  let created = 0
  let rejected = 0

  for (const source of queued.docs as any[]) {
    try {
      const gen = await generateDraft({
        sourceTitle: source.title,
        sourceUrl: source.sourceUrl,
        canonicalUrl: source.canonicalUrl,
        cleanText: source.cleanText,
        agencyTone: toneOfVoice,
      })

      const baseSlug = makeSlug(gen.slug || gen.title)
      const slug = await uniqueSlug(args.payload, baseSlug)
      const lexical = await markdownToLexical({
        config: args.payload.config,
        markdown: gen.markdown,
      })

      await args.payload.create({
        collection: 'drafts',
        data: {
          title: gen.title,
          slug,
          metaTitle: gen.metaTitle,
          metaDescription: gen.metaDescription,
          keywords: gen.keywords.map((k) => ({ value: k })),
          outline: gen.outline,
          excerpt: gen.excerpt,
          content: lexical,
          references: gen.references.map((u) => ({ url: u })),
          sourceRefs: [source.id],
          status: 'ready',
        },
      })

      await args.payload.update({
        collection: 'sources',
        id: source.id,
        data: {
          status: 'processed',
          lastError: null,
        },
      })

      created++
    } catch (e) {
      rejected++
      const message = (e as Error).message
      log('warn', 'draft_failed', { sourceUrl: source.sourceUrl, error: message })

      await args.payload.update({
        collection: 'sources',
        id: source.id,
        data: {
          status: 'rejected',
          lastError: message,
        },
      })
    }
  }

  log('info', 'writer_complete', { created, rejected, considered: queued.totalDocs })
  return { created, rejected, considered: queued.totalDocs }
}
