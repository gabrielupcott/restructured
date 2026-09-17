import { describe, expect, it } from 'vitest'
import { PROBLEMS } from '../content'
import { groupByTrack, trackIdentity, UPCOMING_TRACKS } from './tracks'

describe('groupByTrack', () => {
  const tracks = groupByTrack(PROBLEMS)

  it('chains tracks in the suggested curriculum order', () => {
    expect(tracks.map((track) => track.name)).toEqual([
      'Arrays',
      'Strings',
      'Hash Maps',
      'Two Pointers',
    ])
  })

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

describe('trackIdentity', () => {
  it('gives every shipped track its own motif', () => {
    expect(trackIdentity('Arrays').motif).toBe('[#]')
    expect(trackIdentity('Strings').motif).toBe('"aA"')
    expect(trackIdentity('Hash Maps').motif).toBe('{k:v}')
    expect(trackIdentity('Two Pointers').motif).toBe('<->')
  })

  it('scopes accent classes per track so two tracks never share a color', () => {
    const accents = new Set(
      ['Arrays', 'Strings', 'Hash Maps', 'Two Pointers'].map((name) => trackIdentity(name).bgClass),
    )
    expect(accents.size).toBe(4)
  })

  it('falls back to the neutral cyan identity for undesigned tracks', () => {
    const fallback = trackIdentity('Sliding Window')
    expect(fallback.motif).toBe('[?]')
    expect(fallback.textClass).toBe('text-dos-cyan')
  })

  it('lists the Phase 4 tracks as upcoming', () => {
    expect(UPCOMING_TRACKS[0]).toBe('Sliding Window')
    expect(UPCOMING_TRACKS[UPCOMING_TRACKS.length - 1]).toBe('Dynamic Programming')
  })
})
