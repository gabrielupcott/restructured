import { describe, expect, it } from 'vitest'
import {
  emptyProgress,
  isSolved,
  loadProgress,
  recordAccept,
  recordAttempt,
  recordResult,
  recordSubmission,
  shiftDate,
  totalXp,
  type PlayerProgress,
  type SubmissionEntry,
} from './progress'

function challengeAccept(timeSec: number, runtimeMs: number) {
  return { mode: 'challenge' as const, timeSec, runtimeMs, tier: 'optimal' as const }
}

function submission(at: number, overrides: Partial<SubmissionEntry> = {}): SubmissionEntry {
  return {
    at,
    mode: 'challenge',
    accepted: true,
    passed: 5,
    total: 5,
    code: `code ${at}`,
    ...overrides,
  }
}

describe('recordAttempt', () => {
  it('counts submissions per mode and never mixes them', () => {
    let progress = emptyProgress()
    progress = recordAttempt(progress, 'two-sum', 'challenge')
    progress = recordAttempt(progress, 'two-sum', 'challenge')
    progress = recordAttempt(progress, 'two-sum', 'practice')
    expect(progress.problems['two-sum'].challenge.attempts).toBe(2)
    expect(progress.problems['two-sum'].practice.attempts).toBe(1)
  })
})

describe('recordAccept', () => {
  it('stores the per-mode bests and the last-solved date', () => {
    let progress = emptyProgress()
    progress = recordAccept(progress, 'two-sum', challengeAccept(120, 4.2), '2026-02-03')
    const record = progress.problems['two-sum'].challenge
    expect(record.bestTimeSec).toBe(120)
    expect(record.bestRuntimeMs).toBe(4.2)
    expect(record.bestRuntimeTier).toBe('optimal')
    expect(record.lastSolved).toBe('2026-02-03')
  })

  it('keeps the minimum time and runtime across accepts', () => {
    let progress = emptyProgress()
    progress = recordAccept(progress, 'two-sum', challengeAccept(120, 9.9), '2026-02-03')
    progress = recordAccept(
      progress,
      'two-sum',
      { mode: 'challenge', timeSec: 90, runtimeMs: 3.1, tier: 'optimal' },
      '2026-02-03',
    )
    progress = recordAccept(progress, 'two-sum', challengeAccept(200, 8.0), '2026-02-03')
    const record = progress.problems['two-sum'].challenge
    expect(record.bestTimeSec).toBe(90)
    expect(record.bestRuntimeMs).toBe(3.1)
  })

  it('keeps practice records separate from challenge records', () => {
    let progress = emptyProgress()
    progress = recordAccept(progress, 'two-sum', challengeAccept(120, 4.0), '2026-02-03')
    progress = recordAccept(
      progress,
      'two-sum',
      { mode: 'practice', timeSec: 60, runtimeMs: 4.5, tier: 'optimal' },
      '2026-02-03',
    )
    expect(progress.problems['two-sum'].challenge.bestTimeSec).toBe(120)
    expect(progress.problems['two-sum'].practice.bestTimeSec).toBe(60)
  })

  it('counts a solved problem in either mode', () => {
    let progress = emptyProgress()
    expect(isSolved(progress, 'two-sum')).toBe(false)
    progress = recordAccept(
      progress,
      'two-sum',
      { mode: 'practice', timeSec: 60, runtimeMs: 4.0, tier: 'optimal' },
      '2026-02-03',
    )
    expect(isSolved(progress, 'two-sum')).toBe(true)
  })

  it('starts a streak on the first solve day', () => {
    let progress = emptyProgress()
    progress = recordAccept(progress, 'two-sum', challengeAccept(60, 4.0), '2026-02-03')
    expect(progress.streak).toEqual({ current: 1, longest: 1, lastSolveDate: '2026-02-03' })
  })

  it('extends the streak on consecutive days and holds it within one', () => {
    let progress = emptyProgress()
    progress = recordAccept(progress, 'two-sum', challengeAccept(60, 4.0), '2026-02-03')
    progress = recordAccept(progress, 'two-sum', challengeAccept(60, 4.0), '2026-02-04')
    expect(progress.streak.current).toBe(2)
    progress = recordAccept(progress, 'two-sum', challengeAccept(60, 4.0), '2026-02-04')
    expect(progress.streak.current).toBe(2)
    progress = recordAccept(progress, 'two-sum', challengeAccept(60, 4.0), '2026-02-05')
    expect(progress.streak).toMatchObject({ current: 3, longest: 3 })
  })

  it('resets the current streak after a gap but keeps the longest', () => {
    let progress: PlayerProgress = {
      problems: {},
      streak: { current: 4, longest: 6, lastSolveDate: '2026-01-20' },
    }
    progress = recordAccept(progress, 'two-sum', challengeAccept(60, 4.0), '2026-02-03')
    expect(progress.streak).toEqual({ current: 1, longest: 6, lastSolveDate: '2026-02-03' })
  })
})

describe('recordResult', () => {
  it('stores the best XP and the claim that earned it', () => {
    let progress = emptyProgress()
    progress = recordResult(progress, 'two-sum', { claimedTime: 'O(n^2)', xp: 75 })
    progress = recordResult(progress, 'two-sum', { claimedTime: 'O(n)', xp: 100 })
    expect(progress.problems['two-sum'].bestXp).toBe(100)
    expect(progress.problems['two-sum'].bestClaimedTime).toBe('O(n)')
  })

  it('ignores lower-XP repeats so solves cannot be farmed', () => {
    let progress = emptyProgress()
    progress = recordResult(progress, 'two-sum', { claimedTime: 'O(n)', xp: 100 })
    progress = recordResult(progress, 'two-sum', { claimedTime: 'O(n^2)', xp: 75 })
    expect(progress.problems['two-sum'].bestXp).toBe(100)
    expect(progress.problems['two-sum'].bestClaimedTime).toBe('O(n)')
  })

  it('keeps an earlier claim when a later result makes no claim', () => {
    let progress = emptyProgress()
    progress = recordResult(progress, 'two-sum', { claimedTime: 'O(n)', xp: 100 })
    progress = recordResult(progress, 'two-sum', { claimedTime: null, xp: 150 })
    expect(progress.problems['two-sum'].bestClaimedTime).toBe('O(n)')
  })
})

describe('totalXp', () => {
  it('sums the per-problem bests', () => {
    let progress = emptyProgress()
    progress = recordResult(progress, 'two-sum', { claimedTime: 'O(n)', xp: 100 })
    progress = recordResult(progress, 'two-sum', { claimedTime: 'O(n)', xp: 80 })
    progress = recordResult(progress, 'valid-anagram', { claimedTime: null, xp: 10 })
    expect(totalXp(progress)).toBe(110)
  })
})

describe('recordSubmission', () => {
  it('keeps the newest first and trims to the cap', () => {
    let progress = emptyProgress()
    for (let i = 0; i < 25; i++) {
      progress = recordSubmission(progress, 'two-sum', submission(i))
    }
    const list = progress.submissions!['two-sum']
    expect(list).toHaveLength(20)
    expect(list[0].at).toBe(24)
    expect(list[19].at).toBe(5)
  })

  it('keeps problems separate', () => {
    let progress = emptyProgress()
    progress = recordSubmission(progress, 'two-sum', submission(1))
    progress = recordSubmission(progress, 'valid-anagram', submission(2))
    expect(progress.submissions!['two-sum']).toHaveLength(1)
    expect(progress.submissions!['valid-anagram']).toHaveLength(1)
  })

  it('carries mode, verdict, and code snapshot', () => {
    let progress = emptyProgress()
    progress = recordSubmission(
      progress,
      'two-sum',
      submission(1, { mode: 'practice', accepted: false, passed: 3, total: 5, code: 'def x()' }),
    )
    const entry = progress.submissions!['two-sum'][0]
    expect(entry.mode).toBe('practice')
    expect(entry.accepted).toBe(false)
    expect(entry.passed).toBe(3)
    expect(entry.total).toBe(5)
    expect(entry.code).toBe('def x()')
    expect(entry.runtimeMs).toBeUndefined()
  })
})

describe('shiftDate', () => {
  it('crosses month and year boundaries', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDate('2026-02-03', 1)).toBe('2026-02-04')
  })
})

describe('loadProgress', () => {
  it('returns a fresh progress when storage is unusable', () => {
    expect(loadProgress()).toEqual(emptyProgress())
  })
})
