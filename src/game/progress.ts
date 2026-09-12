/**
 * Local player progress: per-problem, per-mode records, XP, and streaks.
 * Stored in localStorage under one versioned key; the dataset is tiny and
 * single-player, so the synchronous store wins over IndexedDB here.
 *
 * All mutators are pure: they take a PlayerProgress and return a new one.
 */
import type { RuntimeTier } from './tiers'

export type Mode = 'challenge' | 'practice'

export interface ModeRecord {
  /** Best clock reading at an accepted submit, in seconds. */
  bestTimeSec?: number
  /** Best hidden-set runtime total at an accepted submit. */
  bestRuntimeMs?: number
  bestRuntimeTier?: RuntimeTier
  /** Submissions made in this mode, accepted or not. Runs never count. */
  attempts: number
  /** Local date (YYYY-MM-DD) of the last accepted solve. */
  lastSolved?: string
}

export interface ProblemRecord {
  challenge: ModeRecord
  practice: ModeRecord
  /** Best XP ever awarded for this problem; total XP sums these. */
  bestXp: number
  /** Claimed time complexity from the accept that earned bestXp. */
  bestClaimedTime?: string
}

export interface StreakState {
  current: number
  longest: number
  lastSolveDate?: string
}

export interface PlayerProgress {
  problems: Record<string, ProblemRecord>
  streak: StreakState
  /** Most recent submissions per problem, newest first, capped. */
  submissions?: Record<string, SubmissionEntry[]>
}

/** One Submit that ran to completion, with a snapshot of the code. */
export interface SubmissionEntry {
  /** Date.now() at submit time. */
  at: number
  mode: Mode
  accepted: boolean
  passed: number
  total: number
  /** Hidden-set runtime total, present on accepted submits. */
  runtimeMs?: number
  code: string
}

/** Keeps localStorage bounded: the cap oldest entries fall off. */
export const SUBMISSIONS_CAP = 20

export const STORAGE_KEY = 'restructured.progress.v1'

export interface AcceptRecord {
  mode: Mode
  timeSec: number
  runtimeMs: number
  tier: RuntimeTier
}

export interface ResultRecord {
  /** Claimed time complexity from the quiz, when the player made a claim. */
  claimedTime: string | null
  xp: number
}

export function emptyModeRecord(): ModeRecord {
  return { attempts: 0 }
}

export function emptyProblemRecord(): ProblemRecord {
  return { challenge: emptyModeRecord(), practice: emptyModeRecord(), bestXp: 0 }
}

export function emptyProgress(): PlayerProgress {
  return { problems: {}, streak: { current: 0, longest: 0 } }
}

export function loadProgress(): PlayerProgress {
  if (typeof localStorage === 'undefined') return emptyProgress()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>
    if (parsed === null || typeof parsed.problems !== 'object' || parsed.problems === null) {
      return emptyProgress()
    }
    // Records merge over defaults so saves written by older builds load.
    const problems: Record<string, ProblemRecord> = {}
    for (const [id, record] of Object.entries(parsed.problems)) {
      if (typeof record !== 'object' || record === null) continue
      problems[id] = {
        ...emptyProblemRecord(),
        ...record,
        challenge: { ...emptyModeRecord(), ...record.challenge },
        practice: { ...emptyModeRecord(), ...record.practice },
      }
    }
    const streak = parsed.streak
    const submissions = parseSubmissions(parsed.submissions)
    return {
      problems,
      submissions,
      streak:
        streak && typeof streak.current === 'number' && typeof streak.longest === 'number'
          ? streak
          : { current: 0, longest: 0 },
    }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(progress: PlayerProgress): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // storage may be unavailable; the session keeps its in-memory state
  }
}

/** Local calendar date as YYYY-MM-DD. Streaks count these, not UTC days. */
export function todayLocal(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Shifts a YYYY-MM-DD date by whole days, ignoring time zones. */
export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return shifted.toISOString().slice(0, 10)
}

function bumpStreak(streak: StreakState, today: string): StreakState {
  if (streak.lastSolveDate === today) return streak
  const current = streak.lastSolveDate === shiftDate(today, -1) ? streak.current + 1 : 1
  return { current, longest: Math.max(streak.longest, current), lastSolveDate: today }
}

function withProblem(
  progress: PlayerProgress,
  problemId: string,
  update: (record: ProblemRecord) => ProblemRecord,
): PlayerProgress {
  const record = progress.problems[problemId] ?? emptyProblemRecord()
  return { ...progress, problems: { ...progress.problems, [problemId]: update(record) } }
}

function withMode(
  record: ProblemRecord,
  mode: Mode,
  update: (modeRecord: ModeRecord) => ModeRecord,
): ProblemRecord {
  return { ...record, [mode]: update(record[mode]) }
}

/**
 * Loose validation of saved submission lists: entries without a timestamp
 * or a code snapshot would crash the UI, so they are dropped on load.
 */
function parseSubmissions(raw: unknown): Record<string, SubmissionEntry[]> {
  if (typeof raw !== 'object' || raw === null) return {}
  const submissions: Record<string, SubmissionEntry[]> = {}
  for (const [id, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    const entries = (list as unknown[]).filter(
      (entry): entry is SubmissionEntry => {
        if (typeof entry !== 'object' || entry === null) return false
        const candidate = entry as Partial<SubmissionEntry>
        return (
          typeof candidate.at === 'number' &&
          typeof candidate.code === 'string' &&
          typeof candidate.accepted === 'boolean' &&
          (candidate.mode === 'challenge' || candidate.mode === 'practice')
        )
      },
    )
    if (entries.length > 0) submissions[id] = entries
  }
  return submissions
}

/** Counts one submission. Called when Submit is pressed, accepted or not. */
export function recordAttempt(
  progress: PlayerProgress,
  problemId: string,
  mode: Mode,
): PlayerProgress {
  return withProblem(progress, problemId, (record) =>
    withMode(record, mode, (modeRecord) => ({
      ...modeRecord,
      attempts: modeRecord.attempts + 1,
    })),
  )
}

/**
 * Records an accepted solve: last-solved date, streak, and the per-mode
 * bests. `today` is injectable so tests can drive the calendar.
 */
export function recordAccept(
  progress: PlayerProgress,
  problemId: string,
  accept: AcceptRecord,
  today: string = todayLocal(),
): PlayerProgress {
  const next = withProblem(progress, problemId, (record) =>
    withMode(record, accept.mode, (modeRecord) => {
      let bestRuntimeMs = modeRecord.bestRuntimeMs
      let bestRuntimeTier = modeRecord.bestRuntimeTier
      if (bestRuntimeMs === undefined || accept.runtimeMs < bestRuntimeMs) {
        bestRuntimeMs = accept.runtimeMs
        bestRuntimeTier = accept.tier
      }
      return {
        ...modeRecord,
        bestTimeSec:
          modeRecord.bestTimeSec === undefined || accept.timeSec < modeRecord.bestTimeSec
            ? accept.timeSec
            : modeRecord.bestTimeSec,
        bestRuntimeMs,
        bestRuntimeTier,
        lastSolved: today,
      }
    }),
  )
  return { ...next, streak: bumpStreak(next.streak, today) }
}

/**
 * Records a finished scoring flow: the quiz claim and the XP it earned.
 * Only an XP improvement overwrites the stored best and its claim, so
 * re-solving never farms total XP but the improve path can raise an award.
 */
export function recordResult(
  progress: PlayerProgress,
  problemId: string,
  result: ResultRecord,
): PlayerProgress {
  return withProblem(progress, problemId, (record) => {
    if (result.xp <= record.bestXp) return record
    return {
      ...record,
      bestXp: result.xp,
      bestClaimedTime: result.claimedTime ?? record.bestClaimedTime,
    }
  })
}

/**
 * Records one finished submission, newest first, trimmed to the cap.
 */
export function recordSubmission(
  progress: PlayerProgress,
  problemId: string,
  entry: SubmissionEntry,
): PlayerProgress {
  const existing = progress.submissions?.[problemId] ?? []
  const next = [entry, ...existing].slice(0, SUBMISSIONS_CAP)
  return {
    ...progress,
    submissions: { ...(progress.submissions ?? {}), [problemId]: next },
  }
}

export function isSolved(progress: PlayerProgress, problemId: string): boolean {
  const record = progress.problems[problemId]
  if (!record) return false
  return record.challenge.lastSolved !== undefined || record.practice.lastSolved !== undefined
}

export function totalXp(progress: PlayerProgress): number {
  return Object.values(progress.problems).reduce((total, record) => total + record.bestXp, 0)
}
