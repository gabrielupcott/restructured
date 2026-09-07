import { describe, expect, it } from 'vitest'
import { PROBLEMS } from './index'

describe('generated problem content', () => {
  it('ships the phase 1 problems across all four tracks', () => {
    expect(PROBLEMS).toHaveLength(8)
    expect(new Set(PROBLEMS.map((p) => p.track))).toEqual(
      new Set(['Arrays', 'Strings', 'Hash Maps', 'Two Pointers']),
    )
  })

  it('carries computed outputs and measured anchors for every test', () => {
    for (const problem of PROBLEMS) {
      expect(problem.hints).toHaveLength(3)
      expect(problem.parTimeSec).toBeGreaterThan(0)
      expect(problem.anchors.bruteForceRuntimeMs).toBeGreaterThan(
        problem.anchors.optimalRuntimeMs,
      )
      const tests = [...problem.tests.visible, ...problem.tests.hidden]
      expect(tests.length).toBeGreaterThan(0)
      for (const test of tests) {
        expect('expected' in test).toBe(true)
      }
      expect(problem.tests.hidden.length).toBeGreaterThanOrEqual(problem.tests.visible.length)
    }
  })
})
