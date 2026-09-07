export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Complexity {
  time: string
  space: string
}

export interface Example {
  input: Record<string, unknown>
  output: unknown
  explanation?: string
}

/**
 * A test case as authored in a draft: inputs only. The content pipeline
 * computes `expected` by running the optimal reference solution.
 */
export interface DraftTest {
  args: unknown[]
  /** Authored one-liner shown when this visible test fails. */
  failNote?: string
}

/**
 * What content/problems/*.json contains. Expected outputs and anchors are
 * added by scripts/build-content.ts; drafts never carry them.
 */
export interface ProblemDraft {
  id: string
  title: string
  track: string
  difficulty: Difficulty
  topics: string[]
  /** Concept origin reference. */
  source: string
  description: string
  constraints: string[]
  /** Parameter names in call order, used for display and example checks. */
  parameters: string[]
  functionName: string
  starterCode: string
  examples: Example[]
  /** Ladder: conceptual, direction, pseudocode. */
  hints: string[]
  solution: string
  solutionCode: string
  bruteForceCode: string
  /** Shown with hidden-test failure counts. */
  failureHint: string
  /** Defaults from difficulty when omitted: easy 300 / medium 720 / hard 1500. */
  parTimeSec?: number
  expectedComplexity: Complexity
  tests: {
    visible: DraftTest[]
    hidden: DraftTest[]
  }
}

export interface TestCase extends DraftTest {
  expected: unknown
}

/** Reference runtimes measured at content-build time. */
export interface Anchors {
  optimalRuntimeMs: number
  bruteForceRuntimeMs: number
}

export interface Problem extends Omit<ProblemDraft, 'tests' | 'parTimeSec'> {
  parTimeSec: number
  tests: {
    visible: TestCase[]
    hidden: TestCase[]
  }
  anchors: Anchors
}
