import Parser from 'rss-parser'

export type FeedItem = {
  title?: string
  link?: string
  pubDate?: string
  creator?: string
  content?: string
  contentSnippet?: string
}

export const parseRSS = async (xml: string) => {
  const parser = new Parser()
  const feed = await parser.parseString(xml)
  return {
    title: feed.title,
    items: (feed.items || []) as FeedItem[],
  }
}
