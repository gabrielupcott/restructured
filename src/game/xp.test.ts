import { describe, expect, it } from 'vitest'
import { computeXp } from './xp'

describe('computeXp', () => {
  it('pays the difficulty base for a clean solve', () => {
    expect(computeXp('easy', 0, false, true)).toBe(100)
    expect(computeXp('medium', 0, false, true)).toBe(250)
    expect(computeXp('hard', 0, false, true)).toBe(500)
  })

  it('cuts XP by 20% per hint opened', () => {
    expect(computeXp('easy', 1, false, true)).toBe(80)
    expect(computeXp('easy', 2, false, true)).toBe(64)
    expect(computeXp('easy', 3, false, true)).toBe(51)
  })

  it('applies the quiz miss multiplier', () => {
    expect(computeXp('easy', 0, false, false)).toBe(75)
    expect(computeXp('medium', 0, false, false)).toBe(188)
  })

  it('never pays under the 10% floor', () => {
    expect(computeXp('easy', 3, false, false)).toBe(38)
    // 500 * 0.8^10 * 0.75 = 40.1, which the floor lifts to 50.
    expect(computeXp('hard', 10, false, false)).toBe(50)
  })

  it('pays a flat 10% for a solution reveal, ignoring hints and quiz', () => {
    expect(computeXp('easy', 0, true, true)).toBe(10)
    expect(computeXp('medium', 3, true, true)).toBe(25)
    expect(computeXp('hard', 2, true, false)).toBe(50)
  })
})
