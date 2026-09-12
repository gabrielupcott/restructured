import { useEffect, useState } from 'react'
import CodeEditor from '../components/CodeEditor'
import type { Problem, TestCase } from '../content/types'
import type { LintDiagnostic } from '../execution/protocol'
import {
  getSharedRunner,
  type RunHandlers,
  type TestOutcome,
} from '../execution/runner'
import type { AcceptRecord, Mode, SubmissionEntry } from '../game/progress'
import { runtimeTier } from '../game/tiers'
import { useStopwatch } from '../game/useStopwatch'
import { computeXp } from '../game/xp'
import { formatClock, formatMs, formatStamp } from '../lib/format'
import PalettePicker from '../components/PalettePicker'
import { smallestFailingIndex } from '../results/reveal'
import QuizPanel from './QuizPanel'
import ResultsPanel, { type SolveResult } from './ResultsPanel'
interface ProblemScreenProps {
  problem: Problem
  mode: Mode
  /** Failed submissions this session, for the hidden-test reveal. */
  failedSubmits: number
  onFailedSubmit: (id: string) => void
  onAttempt: (id: string, mode: Mode) => void
  onAccepted: (id: string, accept: AcceptRecord) => void
  onResult: (id: string, result: { claimedTime: string | null; xp: number }) => void
  onSubmitted: (id: string, entry: SubmissionEntry) => void
  submissions: SubmissionEntry[]
  onBack: () => void
}

type Scope = 'visible' | 'all'
type Phase = 'coding' | 'quiz' | 'results'

function replaceAt<T>(items: T[], index: number, value: T): T[] {
  const next = items.slice()
  next[index] = value
  return next
}

function formatArgs(problem: Problem, args: unknown[]): string {
  return problem.parameters
    .map((name, i) => `${name} = ${JSON.stringify(args[i])}`)
    .join(', ')
}

function formatInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([name, value]) => `${name} = ${JSON.stringify(value)}`)
    .join(', ')
}

function difficultyClass(difficulty: string): string {
  if (difficulty === 'easy') return 'text-dos-green'
  if (difficulty === 'medium') return 'text-dos-yellow'
  return 'text-dos-red'
}

const STATUS_CHIP: Record<string, { label: string; class: string }> = {
  pass: { label: 'PASS', class: 'text-dos-green' },
  fail: { label: 'FAIL', class: 'text-dos-red' },
  error: { label: 'ERROR', class: 'text-dos-red' },
  timeout: { label: 'TIMEOUT', class: 'text-dos-yellow' },
}

function TestRow({
  title,
  test,
  outcome,
  problem,
}: {
  title: string
  test: TestCase
  outcome: TestOutcome | null
  problem: Problem
}) {
  const pending = outcome === null
  const chip = outcome ? STATUS_CHIP[outcome.status] : null
  return (
    <div className="border-b border-dos-faint py-2">
      <div className="flex items-center gap-3">
        <span className="text-dos-dim">{title}</span>
        {chip ? (
          <span className={`${chip.class} font-bold`}>{chip.label}</span>
        ) : (
          <span className="text-dos-faint">{pending ? '...' : ''}</span>
        )}
        {outcome?.runtimeMs !== undefined && (
          <span className="text-dos-dim">{formatMs(outcome.runtimeMs)}</span>
        )}
        {outcome?.sandboxReset && <span className="text-dos-yellow">■ SANDBOX RESET</span>}
      </div>
      {outcome && outcome.status !== 'pass' && (
        <div className="mt-1 space-y-1 pl-4 text-dos-dim">
          <div>&gt; {formatArgs(problem, test.args)}</div>
          {outcome.status === 'fail' && (
            <>
              <div>&lt; expected: {JSON.stringify(test.expected)}</div>
              <div>&lt; actual: {JSON.stringify(outcome.actual)}</div>
              {test.failNote && <div className="text-dos-yellow">? {test.failNote}</div>}
            </>
          )}
          {outcome.error && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-dos-red">
              {outcome.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProblemScreen({
  problem,
  mode,
  failedSubmits,
  onFailedSubmit,
  onAttempt,
  onAccepted,
  onResult,
  onSubmitted,
  submissions,
  onBack,
}: ProblemScreenProps) {
  const [code, setCode] = useState(problem.starterCode)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope | null>(null)
  const [visibleOutcomes, setVisibleOutcomes] = useState<(TestOutcome | null)[]>([])
  const [hiddenOutcomes, setHiddenOutcomes] = useState<(TestOutcome | null)[]>([])
  const [compileError, setCompileError] = useState<string | null>(null)
  const [sandboxResets, setSandboxResets] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [lintDiagnostics, setLintDiagnostics] = useState<LintDiagnostic[]>([])
  const [phase, setPhase] = useState<Phase>('coding')
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [solutionRevealed, setSolutionRevealed] = useState(false)
  const [pendingAccept, setPendingAccept] = useState<AcceptRecord | null>(null)
  const [solve, setSolve] = useState<SolveResult | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null)
  const clock = useStopwatch()

  // Boot the shared runtime as soon as the screen opens so lint and runs are
  // ready by the time the player finishes reading.
  useEffect(() => {
    getSharedRunner()
  }, [])

  // Debounced pyflakes pass; needs the shared runtime booted and idle.
  useEffect(() => {
    if (running) return
    const timer = setTimeout(() => {
      getSharedRunner()
        .lint(code)
        .then(setLintDiagnostics)
        .catch(() => {
          // worker busy or restarting; the next edit retries
        })
    }, 600)
    return () => clearTimeout(timer)
  }, [code, running])

  /**
   * Finalizes one accepted solve. selfTime is the player's honest claim
   * about their own solution and only drives the improve-it reveal; the
   * optimal pair is what gets graded for XP. Both null when the quiz was
   * skipped or the solution was already revealed.
   */
  function finishSolve(
    accept: AcceptRecord,
    selfTime: string | null,
    optimal: { time: string; space: string } | null,
  ) {
    const quizCorrect =
      optimal !== null &&
      optimal.time === problem.expectedComplexity.time &&
      optimal.space === problem.expectedComplexity.space
    const xp = computeXp(problem.difficulty, hintsRevealed, solutionRevealed, quizCorrect)
    onResult(problem.id, { claimedTime: selfTime, xp })
    setSolve({
      ...accept,
      xp,
      quizCorrect,
      quizSkipped: optimal === null,
      solutionRevealed,
      claimedTime: selfTime,
    })
    setPendingAccept(null)
    setPhase('results')
  }

  /** Called when a submit passes every visible and hidden test. */
  function acceptSolve(runtimeMs: number) {
    const accept: AcceptRecord = {
      mode,
      timeSec: clock.getSeconds(),
      runtimeMs,
      tier: runtimeTier(runtimeMs, problem.anchors),
    }
    onAccepted(problem.id, accept)
    if (solutionRevealed) {
      finishSolve(accept, null, null)
    } else {
      setPendingAccept(accept)
      setPhase('quiz')
    }
  }

  async function execute(nextScope: Scope) {
    if (running) return
    const tests: TestCase[] =
      nextScope === 'visible'
        ? problem.tests.visible
        : [...problem.tests.visible, ...problem.tests.hidden]
    const collected: (TestOutcome | null)[] = []

    setRunning(true)
    setScope(nextScope)
    setCompileError(null)
    setStopped(false)
    setLintDiagnostics([])
    setVisibleOutcomes(problem.tests.visible.map(() => null))
    setHiddenOutcomes(nextScope === 'all' ? problem.tests.hidden.map(() => null) : [])
    if (nextScope === 'all') onAttempt(problem.id, mode)

    const handlers: RunHandlers = {
      onStatus: setStatus,
      onCompileError: setCompileError,
      onTestResult: (index, outcome) => {
        collected.push(outcome)
        if (index < problem.tests.visible.length) {
          setVisibleOutcomes((prev) => replaceAt(prev, index, outcome))
        } else {
          setHiddenOutcomes((prev) => replaceAt(prev, index - problem.tests.visible.length, outcome))
        }
      },
    }
    try {
      const result = await getSharedRunner().runTests({ code, functionName: problem.functionName, tests }, handlers)
      if (result.sandboxResets > 0) setSandboxResets((prev) => prev + result.sandboxResets)
      if (result.stopped) setStopped(true)
      if (nextScope === 'all' && !result.stopped) {
        const allPassed =
          collected.length === tests.length && collected.every((o) => o?.status === 'pass')
        const hiddenStart = problem.tests.visible.length
        const runtimeMs = collected
          .slice(hiddenStart, tests.length)
          .reduce((total, outcome) => total + (outcome?.runtimeMs ?? 0), 0)
        onSubmitted(problem.id, {
          at: Date.now(),
          mode,
          accepted: allPassed,
          passed: collected.filter((o) => o?.status === 'pass').length,
          total: tests.length,
          runtimeMs: allPassed ? runtimeMs : undefined,
          code,
        })
        if (allPassed) acceptSolve(runtimeMs)
        else onFailedSubmit(problem.id)
      }
    } finally {
      setRunning(false)
      setStatus(null)
    }
  }

  const visiblePassed = visibleOutcomes.filter((o) => o?.status === 'pass').length
  const hiddenPassed = hiddenOutcomes.filter((o) => o?.status === 'pass').length
  const hiddenFailed = hiddenOutcomes.filter((o) => o && o.status !== 'pass').length
  const allPassed =
    scope === 'all' &&
    visibleOutcomes.every((o) => o?.status === 'pass') &&
    hiddenOutcomes.every((o) => o?.status === 'pass')
  const revealIndex = failedSubmits >= 3 ? smallestFailingIndex(problem.tests.hidden, hiddenOutcomes) : -1

  let summary = 'IDLE'
  if (running && status) summary = status.toUpperCase()
  else if (compileError) summary = 'INSTALL FAILED'
  else if (stopped) summary = 'STOPPED'
  else if (scope === 'all') {
    summary = allPassed
      ? `ALL TESTS PASSED (${visiblePassed + hiddenPassed}/${visibleOutcomes.length + hiddenOutcomes.length})`
      : `SUBMIT: ${visiblePassed + hiddenPassed}/${visibleOutcomes.length + hiddenOutcomes.length} PASSED`
  } else if (scope === 'visible') {
    summary = `VISIBLE: ${visiblePassed}/${visibleOutcomes.length} PASSED`
  }

  const overtime = mode === 'challenge' && clock.elapsedSec >= problem.parTimeSec

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b-2 border-dos-text px-4 py-2">
        <button
          onClick={onBack}
          className="border-2 border-dos-dim px-2 py-1 text-xs text-dos-dim hover:border-dos-text hover:text-dos-text"
        >
          &lt; BACK
        </button>
        <h1 className="text-xl font-bold tracking-widest">{problem.title}</h1>
        <span className={`text-xs ${difficultyClass(problem.difficulty)}`}>
          {problem.difficulty.toUpperCase()}
        </span>
        {mode === 'challenge' ? (
          <span className={`ml-auto text-sm ${overtime ? 'text-dos-red' : 'text-dos-dim'}`}>
            {formatClock(clock.elapsedSec)}
            {overtime && ` (par ${formatClock(problem.parTimeSec)}, OVERTIME)`}
          </span>
        ) : (
          <span className="ml-auto text-sm text-dos-dim">PRACTICE</span>
        )}
        <PalettePicker />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2 md:grid-rows-1">
        <aside className="max-h-[35vh] min-h-0 overflow-y-auto border-b-2 border-dos-faint p-4 text-sm leading-relaxed md:max-h-none md:border-b-0 md:border-r-2">
          {phase === 'quiz' && pendingAccept ? (
            <QuizPanel
              problem={problem}
              onContinue={(selfTime, optimalTime, optimalSpace) =>
                finishSolve(pendingAccept, selfTime, {
                  time: optimalTime,
                  space: optimalSpace,
                })
              }
              onSkip={() => finishSolve(pendingAccept, null, null)}
            />
          ) : (
            <>
          <h2 className="text-xs tracking-widest text-dos-cyan">BRIEFING</h2>
          <p className="mt-2 whitespace-pre-wrap">{problem.description}</p>

          <h2 className="mt-6 text-xs tracking-widest text-dos-cyan">EXAMPLES</h2>
          <div className="mt-2 space-y-3">
            {problem.examples.map((example, i) => (
              <div key={i} className="border-l-2 border-dos-faint pl-3">
                <div className="text-xs text-dos-faint">EXAMPLE {i + 1}</div>
                <div>&gt; {formatInput(example.input)}</div>
                <div>&lt; {JSON.stringify(example.output)}</div>
                {example.explanation && (
                  <div className="text-xs text-dos-faint">{example.explanation}</div>
                )}
              </div>
            ))}
          </div>

          <h2 className="mt-6 text-xs tracking-widest text-dos-cyan">CONSTRAINTS</h2>
          <ul className="mt-2 list-disc pl-4">
            {problem.constraints.map((constraint, i) => (
              <li key={i}>{constraint}</li>
            ))}
          </ul>

          <h2 className="mt-6 text-xs tracking-widest text-dos-cyan">INTEL</h2>
          <p className="mt-1 text-xs text-dos-faint">
            Each hint cuts XP by 20%. The full solution locks in 10%.
          </p>
          <div className="mt-2 space-y-2">
            {problem.hints.map((hint, i) => {
              if (i < hintsRevealed) {
                return (
                  <div key={i} className="border-l-2 border-dos-faint pl-3 text-dos-dim">
                    <div className="text-xs text-dos-faint">HINT {i + 1}</div>
                    {hint}
                  </div>
                )
              }
              if (i === hintsRevealed) {
                return (
                  <button
                    key={i}
                    onClick={() => setHintsRevealed(i + 1)}
                    className="border border-dos-yellow px-2 py-0.5 text-xs text-dos-yellow hover:bg-dos-yellow hover:text-dos-bg"
                  >
                    REVEAL HINT {i + 1}
                  </button>
                )
              }
              return null
            })}
            {solutionRevealed ? (
              <div className="border-l-2 border-dos-yellow pl-3">
                <div className="text-xs text-dos-yellow">SOLUTION</div>
                <p className="text-dos-dim">{problem.solution}</p>
                <pre className="mt-1 overflow-x-auto text-dos-dim">{problem.solutionCode}</pre>
              </div>
            ) : (
              hintsRevealed === problem.hints.length && (
                <button
                  onClick={() => setSolutionRevealed(true)}
                  className="border border-dos-magenta px-2 py-0.5 text-xs text-dos-magenta hover:bg-dos-magenta hover:text-dos-bg"
                >
                  REVEAL SOLUTION (flat 10% XP)
                </button>
              )
            )}
          </div>

          <h2 className="mt-6 text-xs tracking-widest text-dos-cyan">SUBMISSIONS</h2>
          <div className="mt-2">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="border border-dos-faint px-2 py-0.5 text-xs hover:border-dos-text hover:text-dos-text"
            >
              {historyOpen ? 'HIDE HISTORY' : `VIEW (${submissions.length})`}
            </button>
            {historyOpen && (
              <div className="mt-2 space-y-2">
                {submissions.length === 0 && (
                  <div className="text-xs text-dos-faint">no submissions yet</div>
                )}
                {submissions.map((submission, i) => (
                  <div key={`${submission.at}-${i}`} className="border-l-2 border-dos-faint pl-3">
                    <button
                      onClick={() => setExpandedSubmission(expandedSubmission === i ? null : i)}
                      className="flex w-full flex-wrap items-center gap-2 text-left text-xs"
                    >
                      <span className={submission.accepted ? 'text-dos-green' : 'text-dos-red'}>
                        {submission.accepted ? 'ACCEPTED' : 'FAILED'}
                      </span>
                      <span className="text-dos-dim">
                        {submission.mode === 'challenge' ? 'CHALLENGE' : 'PRACTICE'}
                      </span>
                      <span className="text-dos-faint">
                        {submission.passed}/{submission.total} tests
                      </span>
                      <span className="ml-auto text-dos-faint">{formatStamp(submission.at)}</span>
                    </button>
                    {expandedSubmission === i && (
                      <div className="mt-1">
                        {submission.runtimeMs !== undefined && (
                          <div className="text-xs text-dos-dim">
                            runtime {formatMs(submission.runtimeMs)}
                          </div>
                        )}
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-dos-dim">
                          {submission.code}
                        </pre>
                        <button
                          onClick={() => setCode(submission.code)}
                          className="mt-1 border border-dos-cyan px-2 py-0.5 text-xs text-dos-cyan hover:bg-dos-cyan hover:text-dos-bg"
                        >
                          LOAD INTO EDITOR
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center gap-3 border-b border-dos-faint px-3 py-1 text-xs text-dos-faint">
            <span>function {problem.functionName}()</span>
            <button
              onClick={() => setCode(problem.starterCode)}
              className="ml-auto border border-dos-faint px-2 py-0.5 hover:border-dos-text hover:text-dos-text"
            >
              RESET CODE
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor value={code} onChange={setCode} diagnostics={lintDiagnostics} />
          </div>
        </section>
      </div>

      <footer className="border-t-2 border-dos-text">
        {compileError && (
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap border-b border-dos-red p-3 text-xs text-dos-red">
            {compileError}
          </pre>
        )}
        {sandboxResets > 0 && (
          <div className="border-b border-dos-yellow px-3 py-2 text-xs text-dos-yellow">
            ■ SANDBOX RESET: a test hung past the wall clock and the worker was reloaded
          </div>
        )}
        <div className="max-h-56 overflow-y-auto px-3 py-2 text-xs">
          {scope === null && (
            <div className="text-dos-faint">
              RUN executes the visible tests. SUBMIT runs every test, including hidden ones.
            </div>
          )}
          {visibleOutcomes.length > 0 && (
            <>
              <div className="mt-1 tracking-widest text-dos-cyan">VISIBLE TESTS</div>
              {problem.tests.visible.map((test, i) => (
                <TestRow
                  key={i}
                  title={`TEST ${i + 1}`}
                  test={test}
                  outcome={visibleOutcomes[i] ?? null}
                  problem={problem}
                />
              ))}
            </>
          )}
          {scope === 'all' && hiddenOutcomes.length > 0 && (
            <>
              <div className="mt-3 tracking-widest text-dos-cyan">
                HIDDEN TESTS: {hiddenPassed}/{hiddenOutcomes.length} PASSED
              </div>
              {hiddenFailed > 0 && (
                <div className="py-2 text-dos-yellow">
                  {hiddenFailed} of {hiddenOutcomes.length} hidden tests failed.{' '}
                  {problem.failureHint}
                </div>
              )}
              {revealIndex >= 0 && (
                <div>
                  <div className="py-1 text-dos-magenta">
                    REVEAL (failed submissions: {failedSubmits}): smallest failing hidden test
                  </div>
                  <TestRow
                    title={`HIDDEN ${revealIndex + 1}`}
                    test={problem.tests.hidden[revealIndex]}
                    outcome={hiddenOutcomes[revealIndex] ?? null}
                    problem={problem}
                  />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3 border-t-2 border-dos-text px-3 py-2">
          <div className="flex-1 text-xs text-dos-dim">{summary}</div>
          <button
            onClick={() => execute('visible')}
            disabled={running || phase !== 'coding'}
            className="border-2 border-dos-text px-5 py-1 text-sm hover:bg-dos-text hover:text-dos-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            RUN
          </button>
          <button
            onClick={() => execute('all')}
            disabled={running || phase !== 'coding'}
            className="border-2 border-dos-cyan px-5 py-1 text-sm text-dos-cyan hover:bg-dos-cyan hover:text-dos-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            SUBMIT
          </button>
          <button
            onClick={() => getSharedRunner().stop()}
            disabled={!running}
            className="border-2 border-dos-yellow px-5 py-1 text-sm text-dos-yellow hover:bg-dos-yellow hover:text-dos-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            STOP
          </button>
        </div>
      </footer>

      {phase === 'results' && solve && (
        <ResultsPanel
          problem={problem}
          mode={mode}
          result={solve}
          onImprove={() => {
            setSolve(null)
            setPhase('coding')
          }}
          onBack={onBack}
        />
      )}
    </div>
  )
}
