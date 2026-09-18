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
      'Sliding Window',
      'Stacks',
      'Binary Search',
      'Linked Lists',
      'Trees',
      'Graphs',
      'Dynamic Programming',
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

  it('teaches Arrays from the FizzBuzz warm-up to the first missing hard', () => {
    const arrays = tracks.find((track) => track.name === 'Arrays')
    expect(arrays?.problems.map((problem) => problem.id)).toEqual([
      '01-fizz-buzz',
      '02-two-sum',
      '03-best-time-to-buy-and-sell-stock',
      '04-contains-duplicate',
      '05-product-of-array-except-self',
      '06-first-missing-positive',
    ])
  })

  it('teaches Strings from anagram through minimum window', () => {
    const strings = tracks.find((track) => track.name === 'Strings')
    expect(strings?.problems.map((problem) => problem.id)).toEqual([
      '01-valid-anagram',
      '02-longest-common-prefix',
      '03-find-first-occurrence',
      '04-reverse-words',
      '05-minimum-window-substring',
    ])
  })

  it('builds Hash Maps from anagrams to the heap arc', () => {
    const hashes = tracks.find((track) => track.name === 'Hash Maps')
    expect(hashes?.problems.map((problem) => problem.id)).toEqual([
      '01-group-anagrams',
      '02-longest-consecutive-sequence',
      '03-top-k-frequent',
      '04-kth-largest-element-in-array',
      '05-k-closest-points-to-origin',
    ])
  })

  it('orders Two Pointers from the palindrome to the trapping rain water hard', () => {
    const pointers = tracks.find((track) => track.name === 'Two Pointers')
    expect(pointers?.problems.map((problem) => problem.id)).toEqual([
      '01-valid-palindrome',
      '02-two-sum-sorted',
      '03-container-with-most-water',
      '04-three-sum',
      '05-trapping-rain-water',
    ])
  })

  it('orders Sliding Window from substring to replacement to the hard maximum', () => {
    const window = tracks.find((track) => track.name === 'Sliding Window')
    expect(window?.problems.map((problem) => problem.id)).toEqual([
      '01-longest-substring',
      '02-repeating-character-replacement',
      '03-sliding-window-maximum',
    ])
  })

  it('starts Stacks with the parentheses warm-up and ends on the histogram hard', () => {
    const stacks = tracks.find((track) => track.name === 'Stacks')
    expect(stacks?.problems.map((problem) => problem.id)).toEqual([
      '01-valid-parentheses',
      '02-reverse-polish-notation',
      '03-daily-temperatures',
      '04-largest-rectangle-histogram',
    ])
  })

  it('orders Binary Search from vanilla search to the median hard', () => {
    const search = tracks.find((track) => track.name === 'Binary Search')
    expect(search?.problems.map((problem) => problem.id)).toEqual([
      '01-binary-search',
      '02-search-2d-matrix',
      '03-search-minimum-rotated',
      '04-search-rotated-array',
      '05-median-two-sorted-arrays',
    ])
  })

  it('orders Dynamic Programming from stairs to the burst balloons hard', () => {
    const dp = tracks.find((track) => track.name === 'Dynamic Programming')
    expect(dp?.problems.map((problem) => problem.id)).toEqual([
      '01-climbing-stairs',
      '02-house-robber',
      '03-maximum-subarray',
      '04-jump-game',
      '05-coin-change',
      '06-longest-common-subsequence',
      '07-longest-increasing-subsequence',
      '08-burst-balloons',
    ])
  })

  it('teaches Linked Lists from reversal to the merge-k hard', () => {
    const lists = tracks.find((track) => track.name === 'Linked Lists')
    expect(lists?.problems.map((problem) => problem.id)).toEqual([
      '01-reverse-linked-list',
      '02-merge-two-sorted-lists',
      '03-linked-list-cycle',
      '04-remove-nth-node-from-end',
      '05-merge-k-sorted-lists',
    ])
  })

  it('walks Trees from depth through backtracking to the two hards', () => {
    const trees = tracks.find((track) => track.name === 'Trees')
    expect(trees?.problems.map((problem) => problem.id)).toEqual([
      '01-maximum-depth-of-binary-tree',
      '02-invert-binary-tree',
      '03-diameter-of-binary-tree',
      '04-binary-tree-level-order-traversal',
      '05-validate-binary-search-tree',
      '06-kth-smallest-element-in-a-bst',
      '07-subsets',
      '08-permutations',
      '09-combination-sum',
      '10-binary-tree-maximum-path-sum',
      '11-n-queens',
    ])
  })

  it('opens Graphs with islands and ends on the word ladder hard', () => {
    const graphs = tracks.find((track) => track.name === 'Graphs')
    expect(graphs?.problems.map((problem) => problem.id)).toEqual([
      '01-number-of-islands',
      '02-rotting-oranges',
      '03-clone-graph',
      '04-course-schedule',
      '05-word-ladder',
    ])
  })
})

describe('trackIdentity', () => {
  it('gives every shipped track its own motif', () => {
    expect(trackIdentity('Arrays').motif).toBe('[#]')
    expect(trackIdentity('Strings').motif).toBe('"aA"')
    expect(trackIdentity('Hash Maps').motif).toBe('{k:v}')
    expect(trackIdentity('Two Pointers').motif).toBe('<->')
    expect(trackIdentity('Sliding Window').motif).toBe('[<>]')
    expect(trackIdentity('Stacks').motif).toBe('[||]')
    expect(trackIdentity('Binary Search').motif).toBe('[1|0]')
    expect(trackIdentity('Linked Lists').motif).toBe('[o->]')
    expect(trackIdentity('Trees').motif).toBe('[/\\]')
    expect(trackIdentity('Dynamic Programming').motif).toBe('[::]')
    expect(trackIdentity('Graphs').motif).toBe('[o:o]')
  })

  it('gives every motif across all tracks a unique accent class set', () => {
    const names = [
      'Arrays',
      'Strings',
      'Hash Maps',
      'Two Pointers',
      'Sliding Window',
      'Stacks',
      'Binary Search',
      'Linked Lists',
      'Trees',
      'Graphs',
      'Dynamic Programming',
    ]
    const accents = new Set(names.map((name) => trackIdentity(name).bgClass))
    expect(accents.size).toBe(names.length)
  })

  it('gives Graphs the connected-nodes motif', () => {
    expect(trackIdentity('Graphs').motif).toBe('[o:o]')
  })

  it('falls back to the neutral cyan identity for undesigned tracks', () => {
    const fallback = trackIdentity('Nowhere')
    expect(fallback.motif).toBe('[?]')
    expect(fallback.textClass).toBe('text-dos-cyan')
  })

  it('ships no coming-soon tracks once the roster is complete', () => {
    expect(UPCOMING_TRACKS).toEqual([])
  })
})
