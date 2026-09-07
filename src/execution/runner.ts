/**
 * Main-thread client for the Pyodide worker.
 *
 * Sends one test at a time and enforces the wall-clock timeout from the
 * outside: a test that does not answer within the watchdog window means the
 * worker is hung, so it is terminated and respawned (sandbox reset, Pyodide
 * reload 1-3s). Runtime measurement itself happens inside Python in the
 * harness, so the watchdog never poisons measurements. Lint requests reuse
 * the same worker while it is idle.
 */
import type { LintDiagnostic, WorkerOutbound } from './protocol'

/** Per-test wall-clock limit from the scope doc. */
export const TEST_TIMEOUT_MS = 5000
/** Grace on top of the timeout before declaring the worker hung. */
const WATCHDOG_MS = TEST_TIMEOUT_MS + 2000
const INIT_WATCHDOG_MS = 60_000

export type TestStatus = 'pass' | 'fail' | 'error' | 'timeout'

export interface TestOutcome {
  status: TestStatus
  runtimeMs?: number
  actual?: unknown
  error?: string
  sandboxReset?: boolean
}

export interface RunSpec {
  code: string
  functionName: string
  tests: { args: unknown[]; expected: unknown }[]
}

export interface RunHandlers {
  onStatus?(message: string): void
  onTestResult?(index: number, outcome: TestOutcome): void
  onCompileError?(error: string): void
}

export interface RunResult {
  sandboxResets: number
  stopped: boolean
}

export class SandboxResetError extends Error {}

export class StopError extends Error {}

function canonical(value: unknown): string {
  return JSON.stringify(value)
}

let shared: Runner | null = null

/** One runner for the whole app, so Pyodide stays loaded across screens. */
export function getSharedRunner(): Runner {
  if (!shared) shared = new Runner()
  return shared
}

export class Runner {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private pending: {
    accept: string[]
    resolve: (message: WorkerOutbound) => void
    reject: (error: Error) => void
  } | null = null

  /** Aborts an in-flight run: the worker is killed and the run ends early. */
  stop(): void {
    const pending = this.pending
    if (!pending) return
    pending.reject(new StopError())
    this.killWorker()
  }

  private ensureWorker(): Promise<void> {
    if (this.worker && this.ready) return this.ready
    this.ready = this.spawnWorker()
    return this.ready
  }

  private spawnWorker(): Promise<void> {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
      name: 'pyodide-runner',
    })
    this.worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
      const message = event.data
      const pending = this.pending
      if (!pending) return
      if (message.type === 'fatal') {
        this.pending = null
        pending.reject(new Error(message.error))
      } else if (pending.accept.includes(message.type)) {
        this.pending = null
        pending.resolve(message)
      }
    }
    this.worker.onerror = (event) => {
      const pending = this.pending
      if (pending) {
        this.pending = null
        pending.reject(new Error(event.message || 'worker crashed'))
      }
    }
    const base = `${import.meta.env.BASE_URL}pyodide/`
    return this.ask({ type: 'init', pyodideBase: base }, ['ready'], INIT_WATCHDOG_MS).then(
      () => undefined,
    )
  }

  private ask(
    message: Parameters<Worker['postMessage']>[0],
    accept: string[],
    watchdogMs: number,
  ): Promise<WorkerOutbound> {
    if (!this.worker) throw new StopError()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.killWorker()
        reject(new SandboxResetError())
      }, watchdogMs)
      this.pending = {
        accept,
        resolve: (reply) => {
          clearTimeout(timer)
          resolve(reply)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      }
      this.worker!.postMessage(message)
    })
  }

  private killWorker(): void {
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    this.pending = null
  }

  private async install(spec: RunSpec, handlers: RunHandlers): Promise<boolean> {
    const reply = await this.ask(
      { type: 'install', code: spec.code, functionName: spec.functionName },
      ['installed', 'install-error'],
      WATCHDOG_MS,
    )
    if (reply.type === 'install-error') {
      handlers.onCompileError?.(reply.error)
      return false
    }
    return true
  }

  /**
   * Runs all tests sequentially. Returns the sandbox reset count and whether
   * the run ended because stop() was called.
   */
  async runTests(spec: RunSpec, handlers: RunHandlers): Promise<RunResult> {
    let sandboxResets = 0
    try {
      handlers.onStatus?.('loading pyodide runtime')
      await this.ensureWorker()
      handlers.onStatus?.('installing solution')
      if (!(await this.install(spec, handlers))) return { sandboxResets, stopped: false }

      for (let index = 0; index < spec.tests.length; index++) {
        const test = spec.tests[index]
        let outcome: TestOutcome
        try {
          const reply = await this.ask(
            { type: 'run-one', args: test.args },
            ['result'],
            WATCHDOG_MS,
          )
          if (reply.type !== 'result') {
            throw new Error(`unexpected worker message: ${reply.type}`)
          }
          outcome = this.classify(reply.payload, test.expected)
        } catch (error) {
          if (!(error instanceof SandboxResetError)) throw error
          sandboxResets++
          outcome = {
            status: 'timeout',
            sandboxReset: true,
            error: `test exceeded the ${TEST_TIMEOUT_MS / 1000}s wall clock; worker terminated`,
          }
          handlers.onStatus?.('SANDBOX RESET: reloading runtime')
          await this.ensureWorker()
          if (!(await this.install(spec, handlers))) {
            throw new Error('solution failed to reinstall after sandbox reset', { cause: error })
          }
        }
        handlers.onTestResult?.(index, outcome)
      }
    } catch (error) {
      if (error instanceof StopError) return { sandboxResets, stopped: true }
      throw error
    }
    return { sandboxResets, stopped: false }
  }

  /** Runs pyflakes over the given code. Returns nothing while a run is busy. */
  async lint(code: string): Promise<LintDiagnostic[]> {
    if (this.pending) return []
    await this.ensureWorker()
    if (this.pending) return []
    const reply = await this.ask({ type: 'lint', code }, ['lint-result'], WATCHDOG_MS)
    if (reply.type !== 'lint-result') {
      throw new Error(`unexpected worker message: ${reply.type}`)
    }
    return reply.diagnostics
  }

  private classify(
    payload: { status: string; runtimeMs?: number; actual?: string; error?: string },
    expected: unknown,
  ): TestOutcome {
    if (payload.status === 'error') {
      return { status: 'error', error: payload.error, runtimeMs: payload.runtimeMs }
    }
    if ((payload.runtimeMs ?? 0) >= TEST_TIMEOUT_MS) {
      return { status: 'timeout', runtimeMs: payload.runtimeMs }
    }
    const actual: unknown = JSON.parse(payload.actual ?? 'null')
    if (canonical(actual) === canonical(expected)) {
      return { status: 'pass', runtimeMs: payload.runtimeMs }
    }
    return { status: 'fail', runtimeMs: payload.runtimeMs, actual }
  }

  dispose(): void {
    this.killWorker()
  }
}
