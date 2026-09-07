/**
 * Main-thread client for the Pyodide worker.
 *
 * Sends one test at a time and enforces the wall-clock timeout from the
 * outside: a test that does not answer within the watchdog window means the
 * worker is hung, so it is terminated and respawned (sandbox reset, Pyodide
 * reload 1-3s). Runtime measurement itself happens inside Python in the
 * harness, so the watchdog never poisons measurements.
 */
import type { WorkerOutbound } from './protocol'

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

export class SandboxResetError extends Error {}

function canonical(value: unknown): string {
  return JSON.stringify(value)
}

export class Runner {
  private worker: Worker | null = null
  private pending: {
    accept: string[]
    resolve: (message: WorkerOutbound) => void
    reject: (error: Error) => void
  } | null = null

  private ensureWorker(): Promise<void> {
    if (this.worker) return Promise.resolve()
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

  /** Runs all tests sequentially. Returns the number of sandbox resets. */
  async runTests(spec: RunSpec, handlers: RunHandlers): Promise<number> {
    let sandboxResets = 0
    handlers.onStatus?.('loading pyodide runtime')
    await this.ensureWorker()
    handlers.onStatus?.('installing solution')
    if (!(await this.install(spec, handlers))) return sandboxResets

    for (let index = 0; index < spec.tests.length; index++) {
      const test = spec.tests[index]
      let outcome: TestOutcome
      try {
        const reply = await this.ask({ type: 'run-one', args: test.args }, ['result'], WATCHDOG_MS)
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
    return sandboxResets
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
