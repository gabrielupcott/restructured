import { afterEach, describe, expect, it } from 'vitest'
import { hasBootedThisSession, markBooted, prefersReducedMotion } from './motion'

function stubMatchMedia(matches: boolean) {
  ;(globalThis as { window?: unknown }).window = {
    matchMedia: (query: string) => ({ matches, query }),
  }
}

function stubSessionStorage() {
  const store = new Map<string, string>()
  ;(globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  }
  return store
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage
})

describe('prefersReducedMotion', () => {
  it('returns false without a DOM', () => {
    delete (globalThis as { window?: unknown }).window
    expect(prefersReducedMotion()).toBe(false)
  })

  it('reflects the media query', () => {
    stubMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
    stubMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('session boot flag', () => {
  it('defaults to already booted without session storage', () => {
    expect(hasBootedThisSession()).toBe(true)
  })

  it('reports not booted on a fresh session, then sticks', () => {
    stubSessionStorage()
    expect(hasBootedThisSession()).toBe(false)
    markBooted()
    expect(hasBootedThisSession()).toBe(true)
  })
})
