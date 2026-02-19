import { sleep } from './sleep.js'

type DomainState = {
  nextAt: number
  chain: Promise<void>
}

export class PerDomainRateLimiter {
  private states = new Map<string, DomainState>()
  private readonly minIntervalMs: number

  constructor(rps: number) {
    this.minIntervalMs = rps > 0 ? Math.ceil(1000 / rps) : 0
  }

  async schedule<T>(domain: string, fn: () => Promise<T>): Promise<T> {
    if (this.minIntervalMs <= 0) return fn()

    const state = this.states.get(domain) || {
      nextAt: 0,
      chain: Promise.resolve(),
    }

    let resolveDone: (() => void) | undefined
    const done = new Promise<void>((resolve) => {
      // Wrap the Promise resolver to keep a zero-arg callable.
      resolveDone = () => resolve()
    })

    const startAfter = state.chain
    state.chain = state.chain.then(() => done)
    this.states.set(domain, state)

    await startAfter
    const now = Date.now()
    const wait = Math.max(0, state.nextAt - now)
    if (wait) await sleep(wait)
    state.nextAt = Date.now() + this.minIntervalMs

    try {
      return await fn()
    } finally {
      if (resolveDone) resolveDone()
    }
  }
}
