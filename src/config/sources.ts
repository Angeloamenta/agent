export type SourceConfig = {
  name: string
  type: 'rss' | 'sitemap' | 'html'
  url: string
}

// Public sources only. Prefer RSS/sitemap when available.
export const SOURCES: SourceConfig[] = [
  {
    name: 'Smashing Magazine (Design/UX)',
    type: 'rss',
    url: 'https://www.smashingmagazine.com/feed/',
  },
  {
    name: 'MIT Tech Review (Tech)',
    type: 'rss',
    url: 'https://www.technologyreview.com/feed/',
  },
  {
    name: 'The Verge (Tech)',
    type: 'rss',
    url: 'https://www.theverge.com/rss/index.xml',
  },
  {
    name: 'Hacker News (AI/Web/Tech mix)',
    type: 'rss',
    url: 'https://hnrss.org/newest',
  },
]
