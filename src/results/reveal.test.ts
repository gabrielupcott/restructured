import { describe, expect, it } from 'vitest'
import type { TestCase } from '../content/types'
import type { TestOutcome } from '../execution/runner'
import { smallestFailingIndex } from './reveal'

function testWith(args: unknown[]): TestCase {
  return { args, expected: null }
}

function outcome(status: TestOutcome['status']): TestOutcome {
  return { status }
}

describe('smallestFailingIndex', () => {
  const tests = [testWith([1]), testWith([1, 2, 3, 4, 5]), testWith([1, 2])]

  it('returns -1 when nothing failed', () => {
    const outcomes = [outcome('pass'), outcome('pass'), outcome('pass')]
    expect(smallestFailingIndex(tests, outcomes)).toBe(-1)
  })

  it('picks the failing test with the shortest serialized input', () => {
    const outcomes = [outcome('pass'), outcome('fail'), outcome('fail')]
    expect(smallestFailingIndex(tests, outcomes)).toBe(2)
  })

  it('ignores pending outcomes and passes', () => {
    const outcomes = [null, outcome('fail'), outcome('pass')]
    expect(smallestFailingIndex(tests, outcomes)).toBe(1)
  })
})
