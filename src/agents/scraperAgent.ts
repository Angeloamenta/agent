import type { Payload } from 'payload'

import { SOURCES, type SourceConfig } from '../config/sources.js'
import { envInt } from '../lib/env.js'
import { sha256 } from '../lib/hash.js'
import { fetchText } from '../lib/http.js'
import { childLogger } from '../lib/logger.js'
import { extractArticleFromHTML, looksLikePaywallOrLogin } from '../lib/scraping/html.js'
import { parseRSS } from '../lib/scraping/rss.js'
import { parseSitemap } from '../lib/scraping/sitemap.js'

type ScrapeStats = {
  feeds: number
  discovered: number
  fetched: number
  queued: number
  deduped: number
  rejected: number
}

const withinDaysISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const uniqueUrls = (urls: string[]) => Array.from(new Set(urls.filter(Boolean)))

const toArticleUrlsFromSource = async (source: SourceConfig) => {
  const res = await fetchText(source.url)
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${source.url}`)

  if (source.type === 'rss') {
    const feed = await parseRSS(res.text)
    const links = (feed.items || []).map((i) => i.link).filter(Boolean) as string[]
    return uniqueUrls(links)
  }

  if (source.type === 'sitemap') {
    const urls = parseSitemap(res.text).map((u) => u.loc)
    return uniqueUrls(urls)
  }

  // html fallback (single page)
  return [source.url]
}

export const scrapeAndQueueSources = async (args: {
  payload: Payload
  runId: string
  maxPerFeed?: number
  maxTotal?: number
}) => {
  const log = childLogger({ runId: args.runId, unit: 'scraper' })
  const maxPerFeed = args.maxPerFeed ?? envInt('SCRAPE_MAX_PER_FEED', 5)
  const maxTotal = args.maxTotal ?? envInt('SCRAPE_MAX_TOTAL', 15)

  const stats: ScrapeStats = {
    feeds: 0,
    discovered: 0,
    fetched: 0,
    queued: 0,
    deduped: 0,
    rejected: 0,
  }

  const sourcesList = SOURCES
  stats.feeds = sourcesList.length

  const allTargets: { feed: string; url: string }[] = []
  for (const s of sourcesList) {
    try {
      const urls = await toArticleUrlsFromSource(s)
      const limited = urls.slice(0, maxPerFeed)
      for (const u of limited) allTargets.push({ feed: s.name, url: u })
      log('info', 'discovered_urls', { feed: s.name, count: limited.length })
    } catch (e) {
      log('warn', 'feed_discovery_failed', { feed: s.name, error: (e as Error).message })
    }
  }

  const targets = allTargets.slice(0, maxTotal)
  stats.discovered = targets.length

  for (const t of targets) {
    try {
      const existing = await args.payload.find({
        collection: 'sources',
        where: { sourceUrl: { equals: t.url } },
        limit: 1,
      })

      if (existing.totalDocs > 0) {
        stats.deduped++
        continue
      }

      const res = await fetchText(t.url)
      stats.fetched++
      if (!res.ok) {
        stats.rejected++
        continue
      }

      if (looksLikePaywallOrLogin(res.text)) {
        stats.rejected++
        continue
      }

      const extracted = extractArticleFromHTML(res.text, t.url)
      if (!extracted.cleanText || extracted.cleanText.length < 600) {
        stats.rejected++
        continue
      }

      const contentHash = sha256(extracted.cleanText)

      // Dedup by content hash in last 14 days
      const byHash = await args.payload.find({
        collection: 'sources',
        where: {
          and: [
            { contentHash: { equals: contentHash } },
            { createdAt: { greater_than_equal: withinDaysISO(14) } },
          ],
        },
        limit: 1,
      })
      if (byHash.totalDocs > 0) {
        stats.deduped++
        continue
      }

      await args.payload.create({
        collection: 'sources',
        data: {
          title: extracted.title,
          sourceUrl: t.url,
          canonicalUrl: extracted.canonicalUrl,
          publishedAt: extracted.publishedAt,
          author: extracted.author,
          excerpt: extracted.excerpt,
          rawContent: res.text.slice(0, 20000),
          cleanText: extracted.cleanText,
          topics: [],
          contentHash,
          status: 'queued',
        },
      })

      stats.queued++
    } catch (e) {
      stats.rejected++
      log('warn', 'article_failed', { url: t.url, error: (e as Error).message })
    }
  }

  log('info', 'scrape_complete', stats)
  return stats
}
