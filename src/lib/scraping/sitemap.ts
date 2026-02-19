import { XMLParser } from 'fast-xml-parser'

export type SitemapURL = {
  loc: string
  lastmod?: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
})

export const parseSitemap = (xml: string): SitemapURL[] => {
  const obj = parser.parse(xml)
  if (obj?.urlset?.url) {
    const urls = Array.isArray(obj.urlset.url) ? obj.urlset.url : [obj.urlset.url]
    return urls
      .map((u: any) => ({ loc: u.loc, lastmod: u.lastmod }))
      .filter((u: SitemapURL) => typeof u.loc === 'string' && u.loc.startsWith('http'))
  }

  // sitemapindex support (1-level)
  if (obj?.sitemapindex?.sitemap) {
    const sitemaps = Array.isArray(obj.sitemapindex.sitemap)
      ? obj.sitemapindex.sitemap
      : [obj.sitemapindex.sitemap]
    return sitemaps
      .map((s: any) => ({ loc: s.loc, lastmod: s.lastmod }))
      .filter((u: SitemapURL) => typeof u.loc === 'string' && u.loc.startsWith('http'))
  }

  return []
}
