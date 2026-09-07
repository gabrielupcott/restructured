import { describe, expect, it } from 'vitest'
import { formatClock, formatMs } from './format'

describe('formatClock', () => {
  it('formats par times as MM:SS', () => {
    expect(formatClock(300)).toBe('05:00')
    expect(formatClock(720)).toBe('12:00')
    expect(formatClock(65)).toBe('01:05')
    expect(formatClock(0)).toBe('00:00')
  })
})

describe('formatMs', () => {
  it('picks a readable unit', () => {
    expect(formatMs(0.0042)).toBe('4µs')
    expect(formatMs(0.42)).toBe('420µs')
    expect(formatMs(4.567)).toBe('4.57ms')
    expect(formatMs(41.6)).toBe('42ms')
    expect(formatMs(1234)).toBe('1.23s')
  })
})
