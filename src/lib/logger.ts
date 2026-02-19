type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogRecord = {
  level: LogLevel
  msg: string
  time?: string
  runId?: string
  [key: string]: unknown
}

export const log = (record: LogRecord) => {
  const out: LogRecord = {
    time: new Date().toISOString(),
    ...record,
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out))
}

export const childLogger = (base: Omit<LogRecord, 'msg' | 'level'>) => {
  return (level: LogLevel, msg: string, extra?: Record<string, unknown>) =>
    log({ level, msg, ...base, ...(extra || {}) })
}
