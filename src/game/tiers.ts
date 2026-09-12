import type { Anchors } from '../content/types'

export type RuntimeTier = 'optimal' | 'ok' | 'brute'

export const TIER_LABEL: Record<RuntimeTier, string> = {
  optimal: 'optimal range',
  ok: 'OK',
  brute: 'brute-force range',
}

/**
 * Places a player's hidden-set runtime total on the problem's reference
 * anchors (both measured over the same hidden set at content-build time).
 * Boundaries stay wide on purpose: WASM timings are noisy, so the tier is
 * a safe label, never a precise measurement.
 */
export function runtimeTier(playerMs: number, anchors: Anchors): RuntimeTier {
  const optimalBound = 2 * anchors.optimalRuntimeMs
  if (playerMs <= optimalBound) return 'optimal'
  if (playerMs >= Math.max(optimalBound, anchors.bruteForceRuntimeMs / 2)) return 'brute'
  return 'ok'
}
