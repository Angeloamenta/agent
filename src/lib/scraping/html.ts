import * as cheerio from 'cheerio'

export type ExtractedArticle = {
  title: string
  canonicalUrl?: string
  author?: string
  publishedAt?: string
  excerpt?: string
  cleanText: string
}

const normalizeWhitespace = (s: string) => s.replace(/\s+/g, ' ').trim()

const stripBoilerplate = (s: string) => {
  const lines = s
    .split(/\n+/)
    .map((l) => normalizeWhitespace(l))
    .filter(Boolean)

  // Drop very short lines that are likely nav/UI fragments
  const kept = lines.filter((l) => l.length >= 30)
  return kept.join('\n\n')
}

const normalizePublishedAt = (raw?: string) => {
  if (!raw) return undefined

  const trimmed = raw.trim()
  if (!trimmed) return undefined

  // Fast path: already parseable by JS Date.
  const t0 = Date.parse(trimmed)
  if (Number.isFinite(t0)) return new Date(t0).toISOString()

  // Handle formats like: "2026-02-18 15:00:00 +0000 UTC"
  // Postgres expects an ISO-ish string for timestamptz.
  const m = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([+-]\d{4})(?:\s+UTC)?$/,
  )
  if (m) {
    const date = m[1]
    const time = m[2]
    const tz = m[3]
    const tzIso = `${tz.slice(0, 3)}:${tz.slice(3)}`
    const iso = `${date}T${time}${tzIso}`
    const t1 = Date.parse(iso)
    if (Number.isFinite(t1)) return new Date(t1).toISOString()
  }

  // Unknown format; omit rather than breaking inserts.
  return undefined
}

export const looksLikePaywallOrLogin = (html: string) => {
  const h = html.toLowerCase()
  const signals = [
    'subscribe to continue',
    'subscribe now',
    'sign in to continue',
    'log in to continue',
    'login required',
    'metered paywall',
  ]
  return signals.some((s) => h.includes(s))
}

export const extractArticleFromHTML = (html: string, url: string): ExtractedArticle => {
  const $ = cheerio.load(html)

  const ogTitle = $('meta[property="og:title"]').attr('content')
  const docTitle = $('title').text()
  const h1 = $('h1').first().text()
  const title = normalizeWhitespace(ogTitle || h1 || docTitle || url)

  const canonical =
    $('link[rel="canonical"]').attr('href') ||
    $('meta[property="og:url"]').attr('content') ||
    undefined

  const excerpt =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    undefined

  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    undefined

  const publishedAtRaw =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    undefined
  const publishedAt = normalizePublishedAt(publishedAtRaw)

  // Remove common non-content elements
  $('script, style, noscript, nav, header, footer, aside').remove()

  const articleText = normalizeWhitespace($('article').text())
  const mainText = normalizeWhitespace($('main').text())
  const bodyText = normalizeWhitespace($('body').text())

  const best = articleText.length >= 400 ? articleText : mainText.length >= 400 ? mainText : bodyText
  const cleanText = stripBoilerplate(best)

  return {
    title,
    canonicalUrl: canonical,
    author,
    publishedAt,
    excerpt,
    cleanText,
  }
}
