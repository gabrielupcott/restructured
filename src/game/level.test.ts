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
    expect(titleForXp(1499)).toBe('BEGINNER')
    expect(titleForXp(1500)).toBe('NOVICE')
    expect(titleForXp(3999)).toBe('NOVICE')
    expect(titleForXp(4000)).toBe('INTERMEDIATE')
    expect(titleForXp(7499)).toBe('INTERMEDIATE')
    expect(titleForXp(7500)).toBe('EXPERIENCED')
    expect(titleForXp(11499)).toBe('EXPERIENCED')
    expect(titleForXp(11500)).toBe('PROFESSIONAL')
    expect(titleForXp(14999)).toBe('PROFESSIONAL')
    expect(titleForXp(15000)).toBe('EXPERT')
  })

  it('keeps EXPERT below the roster ceiling and above every real award', () => {
    // Perfect run of all 62 roster problems: 15,700 XP.
    expect(titleForXp(15700)).toBe('EXPERT')
    // The largest single award (a hard problem, no hints, quiz correct) is 500.
    expect(titleForXp(500)).toBe('BEGINNER')
  })

  it('clamps negative and non-finite input to BEGINNER', () => {
    expect(titleForXp(-5)).toBe('BEGINNER')
    expect(titleForXp(Number.NaN)).toBe('BEGINNER')
    expect(titleForXp(Number.POSITIVE_INFINITY)).toBe('BEGINNER')
  })

  it('floors fractional XP', () => {
    expect(titleForXp(1499.9)).toBe('BEGINNER')
    expect(titleForXp(1500.9)).toBe('NOVICE')
  })
})
