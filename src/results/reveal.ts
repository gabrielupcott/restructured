import type { TestCase } from '../content/types'
import type { TestOutcome } from '../execution/runner'

/**
 * After 3 failed submissions, reveal the single smallest failing
 * hidden test. "Smallest" means the shortest serialized input.
 */
export function smallestFailingIndex(
  tests: TestCase[],
  outcomes: (TestOutcome | null)[],
): number {
  let best = -1
  let bestSize = Number.POSITIVE_INFINITY
  tests.forEach((test, index) => {
    const outcome = outcomes[index]
    if (!outcome || outcome.status === 'pass') return
    const size = JSON.stringify(test.args).length
    if (size < bestSize) {
      bestSize = size
      best = index
    }
  })
  return best
}
