import { getPayload } from 'payload'

let cached: Awaited<ReturnType<typeof getPayload>> | null = null

export const getPayloadClient = async () => {
  if (cached) return cached

  // Lazy import so env can be loaded before config eval (worker context)
  const { default: config } = await import('../payload.config.js')
  cached = await getPayload({ config })
  return cached
}
