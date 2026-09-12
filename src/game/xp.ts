import type { Difficulty } from '../content/types'

/** XP constants from the scope doc. Tunable by decision only. */
export const XP_BASE: Record<Difficulty, number> = {
  easy: 100,
  medium: 250,
  hard: 500,
}

const HINT_DECAY = 0.8
const QUIZ_MISS_MULTIPLIER = 0.75
const FLOOR_SHARE = 0.1
const SOLUTION_SHARE = 0.1

/**
 * XP for one accepted solve: base scaled down by each hint opened and by a
 * missed complexity quiz, floored at 10% of base. Revealing the full
 * solution skips the quiz and locks the award at a flat 10% of base.
 */
export function computeXp(
  difficulty: Difficulty,
  hintsUsed: number,
  solutionRevealed: boolean,
  quizCorrect: boolean,
): number {
  const base = XP_BASE[difficulty]
  if (solutionRevealed) return Math.round(base * SOLUTION_SHARE)
  const raw = base * Math.pow(HINT_DECAY, hintsUsed) * (quizCorrect ? 1 : QUIZ_MISS_MULTIPLIER)
  return Math.max(Math.round(raw), Math.round(base * FLOOR_SHARE))
}
