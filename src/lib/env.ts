export const envInt = (key: string, fallback: number) => {
  const raw = process.env[key]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

export const envBool = (key: string, fallback = false) => {
  const raw = process.env[key]
  if (!raw) return fallback
  return ['1', 'true', 'yes', 'y', 'on'].includes(raw.toLowerCase())
}

export const envStr = (key: string, fallback?: string) => {
  const raw = process.env[key]
  return raw && raw.length ? raw : fallback
}
