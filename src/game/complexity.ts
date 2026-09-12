/**
 * The standard complexity ladder. It drives quiz options, the ordering
 * behind the "can you improve it" reveal, and nothing else.
 */
export const COMPLEXITY_LADDER: readonly string[] = [
  'O(1)',
  'O(log n)',
  'O(n)',
  'O(n log n)',
  'O(n^2)',
  'O(2^n)',
]

export function complexityRank(value: string): number {
  return COMPLEXITY_LADDER.indexOf(value)
}

/**
 * True when the claimed time complexity sits strictly above the expected
 * one on the ladder, which is what fires the improve-it reveal. Classes
 * off the ladder (parameterized shapes such as O(n k log k)) have no
 * honest ordering, so they are never judged.
 */
export function isWorseThanExpected(claimed: string | null, expected: string): boolean {
  if (claimed === null) return false
  const claimedRank = complexityRank(claimed)
  const expectedRank = complexityRank(expected)
  if (claimedRank < 0 || expectedRank < 0) return false
  return claimedRank > expectedRank
}

/** Quiz options for one question: the ladder, plus the expected answer. */
export function quizOptions(expected: string): string[] {
  if (COMPLEXITY_LADDER.includes(expected)) return [...COMPLEXITY_LADDER]
  return [...COMPLEXITY_LADDER, expected]
}
