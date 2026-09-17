import { describe, expect, it } from 'vitest'
import { LEVELS, titleForXp } from './level'

describe('titleForXp', () => {
  it('returns BEGINNER at zero XP', () => {
    expect(titleForXp(0)).toBe('BEGINNER')
  })

  it('returns each title exactly at its threshold', () => {
    for (const level of LEVELS) {
      expect(titleForXp(level.xp)).toBe(level.title)
    }
  })

  it('returns the highest threshold reached', () => {
    expect(titleForXp(199)).toBe('BEGINNER')
    expect(titleForXp(200)).toBe('NOVICE')
    expect(titleForXp(499)).toBe('NOVICE')
    expect(titleForXp(500)).toBe('INTERMEDIATE')
    expect(titleForXp(899)).toBe('INTERMEDIATE')
    expect(titleForXp(900)).toBe('EXPERIENCED')
    expect(titleForXp(1399)).toBe('EXPERIENCED')
    expect(titleForXp(1400)).toBe('PROFESSIONAL')
    expect(titleForXp(1999)).toBe('PROFESSIONAL')
    expect(titleForXp(2000)).toBe('EXPERT')
  })

  it('keeps EXPERT above the top threshold', () => {
    expect(titleForXp(100000)).toBe('EXPERT')
  })

  it('clamps negative and non-finite input to BEGINNER', () => {
    expect(titleForXp(-5)).toBe('BEGINNER')
    expect(titleForXp(Number.NaN)).toBe('BEGINNER')
    expect(titleForXp(Number.POSITIVE_INFINITY)).toBe('BEGINNER')
  })

  it('floors fractional XP', () => {
    expect(titleForXp(199.9)).toBe('BEGINNER')
    expect(titleForXp(200.9)).toBe('NOVICE')
  })
})
