/** Shared message protocol between the main thread runner and the worker. */

export interface HarnessPayload {
  status: 'ok' | 'error'
  runtimeMs?: number
  actual?: string
  error?: string
}

export interface LintDiagnostic {
  line: number
  column: number
  message: string
  severity: 'warning' | 'error'
}

export type WorkerInbound =
  | { type: 'init'; pyodideBase: string }
  | { type: 'install'; code: string; functionName: string }
  | { type: 'run-one'; args: unknown[] }
  | { type: 'lint'; code: string }

export type WorkerOutbound =
  | { type: 'ready' }
  | { type: 'installed' }
  | { type: 'install-error'; error: string }
  | { type: 'result'; payload: HarnessPayload }
  | { type: 'lint-result'; diagnostics: LintDiagnostic[] }
  | { type: 'fatal'; error: string }
