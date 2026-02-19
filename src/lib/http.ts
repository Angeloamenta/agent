import { envInt, envStr } from './env.js'
import { PerDomainRateLimiter } from './rateLimit.js'

const timeoutMs = envInt('SCRAPE_TIMEOUT_MS', 15000)
const rps = envInt('SCRAPE_PER_DOMAIN_RPS', 1)
const userAgent = envStr('SCRAPE_USER_AGENT', 'payload-content-engine/1.0')

const limiter = new PerDomainRateLimiter(rps)

export type FetchResult = {
  url: string
  status: number
  ok: boolean
  contentType: string | null
  text: string
}

export const fetchText = async (url: string): Promise<FetchResult> => {
  const u = new URL(url)
  const domain = u.hostname

  return limiter.schedule(domain, async () => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'user-agent': userAgent || 'payload-content-engine/1.0',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      const text = await res.text()
      return {
        url,
        status: res.status,
        ok: res.ok,
        contentType: res.headers.get('content-type'),
        text,
      }
    } finally {
      clearTimeout(t)
    }
  })
}
