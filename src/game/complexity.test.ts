import { describe, expect, it } from 'vitest'
import { complexityRank, isWorseThanExpected, quizOptions } from './complexity'

describe('complexityRank', () => {
  it('orders the ladder from cheap to expensive', () => {
    expect(complexityRank('O(1)')).toBeLessThan(complexityRank('O(log n)'))
    expect(complexityRank('O(log n)')).toBeLessThan(complexityRank('O(n)'))
    expect(complexityRank('O(n)')).toBeLessThan(complexityRank('O(n log n)'))
    expect(complexityRank('O(n log n)')).toBeLessThan(complexityRank('O(n^2)'))
    expect(complexityRank('O(n^2)')).toBeLessThan(complexityRank('O(2^n)'))
  })

  it('returns -1 for classes off the ladder', () => {
    expect(complexityRank('O(n k log k)')).toBe(-1)
    expect(complexityRank('O(k)')).toBe(-1)
    expect(complexityRank('linear')).toBe(-1)
  })
})

describe('isWorseThanExpected', () => {
  it('fires when the claim sits above the expectation', () => {
    expect(isWorseThanExpected('O(n^2)', 'O(n)')).toBe(true)
    expect(isWorseThanExpected('O(n log n)', 'O(n)')).toBe(true)
    expect(isWorseThanExpected('O(2^n)', 'O(log n)')).toBe(true)
  })

  it('stays quiet on equal or better claims', () => {
    expect(isWorseThanExpected('O(n)', 'O(n)')).toBe(false)
    expect(isWorseThanExpected('O(n)', 'O(n log n)')).toBe(false)
    expect(isWorseThanExpected('O(1)', 'O(n)')).toBe(false)
  })

  it('never judges off-ladder classes', () => {
    expect(isWorseThanExpected('O(n k log k)', 'O(n)')).toBe(false)
    expect(isWorseThanExpected('O(n^2)', 'O(n k log k)')).toBe(false)
    expect(isWorseThanExpected(null, 'O(n)')).toBe(false)
  })
})

describe('quizOptions', () => {
  it('offers the plain ladder when the expectation is on it', () => {
    expect(quizOptions('O(n)')).toHaveLength(6)
    expect(quizOptions('O(n)')).toContain('O(n)')
  })

  it('appends parameterized expectations as an extra option', () => {
    const options = quizOptions('O(n k log k)')
    expect(options).toHaveLength(7)
    expect(options).toContain('O(n k log k)')
  })
})
