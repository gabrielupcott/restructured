import { describe, expect, it } from 'vitest'
import { runtimeTier, TIER_LABEL } from './tiers'

const WIDE = { optimalRuntimeMs: 10, bruteForceRuntimeMs: 400 }
const CLOSE = { optimalRuntimeMs: 2.8, bruteForceRuntimeMs: 7.9 }

describe('runtimeTier', () => {
  it('labels up to twice the optimal anchor as optimal range', () => {
    expect(runtimeTier(10, WIDE)).toBe('optimal')
    expect(runtimeTier(20, WIDE)).toBe('optimal')
  })

  it('labels half the brute anchor or beyond as brute-force range', () => {
    expect(runtimeTier(200, WIDE)).toBe('brute')
    expect(runtimeTier(1000, WIDE)).toBe('brute')
  })

  it('keeps the middle honest with an OK label', () => {
    expect(runtimeTier(100, WIDE)).toBe('ok')
  })

  it('protects correct solutions when anchors sit close together', () => {
    // The brute anchor is only ~2.8x the optimal one; a correct solution
    // that reads a little high must not wear the brute-force label.
    expect(runtimeTier(5.6, CLOSE)).toBe('optimal')
    expect(runtimeTier(6.0, CLOSE)).toBe('brute')
    expect(runtimeTier(7.9, CLOSE)).toBe('brute')
  })

  it('exposes a display label for every tier', () => {
    expect(TIER_LABEL.optimal).toBe('optimal range')
    expect(TIER_LABEL.ok).toBe('OK')
    expect(TIER_LABEL.brute).toBe('brute-force range')
  })
})
