/**
 * Content pipeline.
 *
 * Reads drafts from content/problems/*.json, executes the optimal and
 * brute-force reference solutions in Pyodide (Node) to compute expected
 * outputs, measures runtime anchors, validates schema completeness,
 * reference agreement, test strength and phrasing originality, then writes
 * the committed bundle src/content/generated/problems.ts.
 *
 * Run with: npm run content:build
 */
import { loadPyodide } from 'pyodide'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import type { Anchors, DraftTest, Problem, ProblemDraft, TestCase } from '../src/content/types.ts'

const DRAFTS_DIR = 'content/problems'
const OUT_FILE = 'src/content/generated/problems.ts'
const HARNESS_FILE = new URL('../src/execution/harness.py', import.meta.url)

/** Brute force must finish the hidden set in about 4s (scope doc). */
const BRUTE_BUDGET_MS = 4000
/** Test strength: brute must separate from optimal on the largest hidden test. */
const STRENGTH_RATIO = 3
const STRENGTH_MIN_ABS_MS = 5

/** phrasing-originality blocklist: canonical LeetCode boilerplate.
 *  Problem names are allowed; this list targets prose only. */
const PHRASE_BLOCKLIST = [
  'given an array of integers',
  'given an integer array',
  'given a string s',
  'exactly one valid answer',
  'you may assume',
  'same element twice',
  'indices of the two numbers',
  'add up to a specific target',
  'returns the indices',
]

const PAR_TIME_BY_DIFFICULTY: Record<string, number> = {
  easy: 300,
  medium: 720,
  hard: 1500,
}

const REQUIRED_FIELDS = [
  'id',
  'title',
  'track',
  'difficulty',
  'topics',
  'source',
  'description',
  'constraints',
  'parameters',
  'functionName',
  'starterCode',
  'examples',
  'hints',
  'solution',
  'solutionCode',
  'bruteForceCode',
  'failureHint',
  'expectedComplexity',
  'tests',
] as const

interface HarnessOutcome {
  status: 'ok' | 'error'
  runtimeMs?: number
  actual?: string
  error?: string
}

function requireFields(draft: ProblemDraft): void {
  for (const field of REQUIRED_FIELDS) {
    if (draft[field] === undefined) {
      throw new Error(`${draft.id ?? '?'}: missing required field "${field}"`)
    }
  }
  if (draft.hints.length !== 3) {
    throw new Error(`${draft.id}: hint ladder must have exactly 3 hints`)
  }
  for (const code of [draft.starterCode, draft.solutionCode, draft.bruteForceCode]) {
    if (!code.includes(draft.functionName)) {
      throw new Error(`${draft.id}: a code block never defines ${draft.functionName}`)
    }
  }
}

function checkOriginality(draft: ProblemDraft): void {
  const text = [draft.title, draft.description, ...draft.constraints]
    .join('\n')
    .toLowerCase()
  for (const phrase of PHRASE_BLOCKLIST) {
    if (text.includes(phrase)) {
      throw new Error(`${draft.id}: description contains canonical phrasing "${phrase}"`)
    }
  }
}

function canonical(value: unknown): string {
  return JSON.stringify(value)
}

function parseOutcome(raw: string): HarnessOutcome {
  return JSON.parse(raw) as HarnessOutcome
}

async function runAgainst(
  py: Awaited<ReturnType<typeof loadPyodide>>,
  code: string,
  functionName: string,
  tests: DraftTest[],
): Promise<HarnessOutcome[]> {
  py.globals.set('__CODE', code)
  py.globals.set('__FN', functionName)
  await py.runPythonAsync('install_solution()')
  const outcomes: HarnessOutcome[] = []
  for (const test of tests) {
    py.globals.set('__ARGS_JSON', JSON.stringify(test.args))
    const raw = await py.runPythonAsync('run_one()')
    outcomes.push(parseOutcome(String(raw)))
  }
  return outcomes
}

function requireOk(draft: ProblemDraft, which: string, outcomes: HarnessOutcome[]): void {
  outcomes.forEach((outcome, i) => {
    if (outcome.status !== 'ok') {
      throw new Error(`${draft.id}: ${which} reference failed on test ${i}: ${outcome.error}`)
    }
  })
}

function withExpected(tests: DraftTest[], outcomes: HarnessOutcome[]): TestCase[] {
  return tests.map((test, i) => ({ ...test, expected: JSON.parse(outcomes[i].actual!) }))
}

function checkExamplesAgree(draft: ProblemDraft, visible: TestCase[]): void {
  const count = Math.min(draft.examples.length, visible.length)
  for (let i = 0; i < count; i++) {
    const example = draft.examples[i]
    const args = draft.parameters.map((name) => example.input[name])
    if (canonical(args) !== canonical(visible[i].args)) {
      throw new Error(`${draft.id}: example ${i + 1} input does not match visible test ${i + 1}`)
    }
    if (canonical(example.output) !== canonical(visible[i].expected)) {
      throw new Error(
        `${draft.id}: example ${i + 1} output disagrees with the reference solution ` +
          `(example says ${canonical(example.output)}, reference computes ${canonical(visible[i].expected)})`,
      )
    }
  }
}

function measureAnchors(
  draft: ProblemDraft,
  optimalOutcomes: HarnessOutcome[],
  bruteOutcomes: HarnessOutcome[],
): Anchors {
  const sum = (outcomes: HarnessOutcome[]) =>
    outcomes.reduce((total, o) => total + (o.runtimeMs ?? 0), 0)
  const optimalTotal = sum(optimalOutcomes)
  const bruteTotal = sum(bruteOutcomes)

  if (bruteTotal > BRUTE_BUDGET_MS) {
    throw new Error(
      `${draft.id}: brute force needs ${Math.round(bruteTotal)}ms on the hidden set, ` +
        `over the ${BRUTE_BUDGET_MS}ms budget. Shrink the hidden tests.`,
    )
  }

  // Strength on the largest hidden test.
  let largest = 0
  draft.tests.hidden.forEach((test, i) => {
    if (canonical(test.args).length > canonical(draft.tests.hidden[largest].args).length) {
      largest = i
    }
  })
  const optimalMs = optimalOutcomes[largest].runtimeMs ?? 0
  const bruteMs = bruteOutcomes[largest].runtimeMs ?? 0
  const separated = bruteMs >= STRENGTH_RATIO * optimalMs || bruteMs - optimalMs >= STRENGTH_MIN_ABS_MS
  if (!separated) {
    throw new Error(
      `${draft.id}: weak tests. On the largest hidden test brute force took ` +
        `${bruteMs.toFixed(2)}ms vs optimal ${optimalMs.toFixed(2)}ms; tiers would never render. ` +
        `Grow the largest hidden test.`,
    )
  }
  return { optimalRuntimeMs: optimalTotal, bruteForceRuntimeMs: bruteTotal }
}

function buildProblem(
  draft: ProblemDraft,
  visible: TestCase[],
  hidden: TestCase[],
  anchors: Anchors,
): Problem {
  const { tests: _draftTests, parTimeSec, ...rest } = draft
  return {
    ...rest,
    parTimeSec: parTimeSec ?? PAR_TIME_BY_DIFFICULTY[draft.difficulty],
    tests: { visible, hidden },
    anchors,
  }
}

async function main(): Promise<void> {
  const draftFiles = readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.json'))
  if (draftFiles.length === 0) {
    throw new Error(`no drafts found in ${DRAFTS_DIR}`)
  }

  const harness = readFileSync(HARNESS_FILE, 'utf8')
  const py = await loadPyodide()
  await py.runPythonAsync(harness)

  const problems: Problem[] = []
  for (const file of draftFiles) {
    const draft = JSON.parse(readFileSync(`${DRAFTS_DIR}/${file}`, 'utf8')) as unknown as ProblemDraft
    requireFields(draft)
    checkOriginality(draft)

    const allTests = [...draft.tests.visible, ...draft.tests.hidden]
    const optimal = await runAgainst(py, draft.solutionCode, draft.functionName, allTests)
    requireOk(draft, 'optimal', optimal)
    const brute = await runAgainst(py, draft.bruteForceCode, draft.functionName, allTests)
    requireOk(draft, 'brute-force', brute)

    optimal.forEach((outcome, i) => {
      if (outcome.actual !== brute[i].actual) {
        throw new Error(
          `${draft.id}: references disagree on test ${i}: ` +
            `optimal=${outcome.actual} brute=${brute[i].actual}`,
        )
      }
    })

    const visible = withExpected(draft.tests.visible, optimal.slice(0, draft.tests.visible.length))
    const hidden = withExpected(draft.tests.hidden, optimal.slice(draft.tests.visible.length))
    checkExamplesAgree(draft, visible)
    const anchors = measureAnchors(draft, optimal.slice(draft.tests.visible.length), brute.slice(draft.tests.visible.length))
    problems.push(buildProblem(draft, visible, hidden, anchors))

    console.log(
      `${draft.id}: ${visible.length} visible + ${hidden.length} hidden tests verified; ` +
        `anchors optimal ${anchors.optimalRuntimeMs.toFixed(2)}ms / brute ${anchors.bruteForceRuntimeMs.toFixed(2)}ms`,
    )
  }

  const json = JSON.stringify(problems, null, 2)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  const banner =
    '// GENERATED FILE. Created by scripts/build-content.ts from content/problems/*.json.\n' +
    '// Expected outputs are computed, never drafted. Do not edit by hand:\n' +
    '// change the drafts and run `npm run content:build`.\n'
  mkdirSync('src/content/generated', { recursive: true })
  writeFileSync(OUT_FILE, `${banner}import type { Problem } from '../types'\n\nexport const PROBLEMS: Problem[] = ${json}\n`)
  console.log(`wrote ${OUT_FILE} with ${problems.length} problem(s)`)
}

main().catch((error) => {
  console.error('content pipeline failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
