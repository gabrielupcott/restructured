import { describe, expect, it } from 'vitest'
import { PROBLEMS } from '../content'
import { groupByTrack } from './tracks'

describe('groupByTrack', () => {
  const tracks = groupByTrack(PROBLEMS)

  it('keeps every problem exactly once', () => {
    const total = tracks.reduce((sum, track) => sum + track.problems.length, 0)
    expect(total).toBe(PROBLEMS.length)
  })

  it('orders each track easy before medium before hard', () => {
    const rank: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
    for (const track of tracks) {
      const ranks = track.problems.map((problem) => rank[problem.difficulty])
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    }
  })

  it('starts Strings with the anagram warm-up, not the sliding window', () => {
    const strings = tracks.find((track) => track.name === 'Strings')
    expect(strings?.problems.map((problem) => problem.id)).toEqual([
      'valid-anagram',
      'longest-substring',
    ])
  })

  it('starts Two Pointers with the palindrome, not the container', () => {
    const pointers = tracks.find((track) => track.name === 'Two Pointers')
    expect(pointers?.problems.map((problem) => problem.id)).toEqual([
      'valid-palindrome',
      'container-with-most-water',
    ])
  })
})
