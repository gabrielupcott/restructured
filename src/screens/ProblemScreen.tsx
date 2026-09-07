import { useRef, useState } from 'react'
import CodeEditor from '../components/CodeEditor'
import type { Problem, TestCase } from '../content/types'
import { Runner, type RunHandlers, type TestOutcome } from '../execution/runner'
import { formatClock, formatMs } from '../lib/format'
import PalettePicker from '../components/PalettePicker'
import { smallestFailingIndex } from '../results/reveal'

interface ProblemScreenProps {
  problem: Problem
  /** Failed submissions this session, for the hidden-test reveal. */
  failedSubmits: number
  onFailedSubmit: (id: string) => void
  onBack: () => void
}

type Scope = 'visible' | 'all'

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
  failedSubmits,
  onFailedSubmit,
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
  const runnerRef = useRef<Runner | null>(null)

  function getRunner(): Runner {
    if (!runnerRef.current) runnerRef.current = new Runner()
    return runnerRef.current
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
    setVisibleOutcomes(problem.tests.visible.map(() => null))
    setHiddenOutcomes(nextScope === 'all' ? problem.tests.hidden.map(() => null) : [])

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
      const resets = await getRunner().runTests({ code, functionName: problem.functionName, tests }, handlers)
      if (resets > 0) setSandboxResets((prev) => prev + resets)
    } finally {
      setRunning(false)
      setStatus(null)
      if (nextScope === 'all' && collected.some((o) => o && o.status !== 'pass')) {
        onFailedSubmit(problem.id)
      }
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
  else if (scope === 'all') {
    summary = allPassed
      ? `ALL TESTS PASSED (${visiblePassed + hiddenPassed}/${visibleOutcomes.length + hiddenOutcomes.length})`
      : `SUBMIT: ${visiblePassed + hiddenPassed}/${visibleOutcomes.length + hiddenOutcomes.length} PASSED`
  } else if (scope === 'visible') {
    summary = `VISIBLE: ${visiblePassed}/${visibleOutcomes.length} PASSED`
  }

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
        <span className="ml-auto text-xs text-dos-dim">
          PAR {formatClock(problem.parTimeSec)}
        </span>
        <PalettePicker />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2 md:grid-rows-1">
        <aside className="max-h-[35vh] min-h-0 overflow-y-auto border-b-2 border-dos-faint p-4 text-sm leading-relaxed md:max-h-none md:border-b-0 md:border-r-2">
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
            <CodeEditor value={code} onChange={setCode} />
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
            disabled={running}
            className="border-2 border-dos-text px-5 py-1 text-sm hover:bg-dos-text hover:text-dos-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            RUN
          </button>
          <button
            onClick={() => execute('all')}
            disabled={running}
            className="border-2 border-dos-cyan px-5 py-1 text-sm text-dos-cyan hover:bg-dos-cyan hover:text-dos-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            SUBMIT
          </button>
        </div>
      </footer>
    </div>
  )
}
