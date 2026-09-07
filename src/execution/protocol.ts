/** Shared message protocol between the main thread runner and the worker. */

export interface HarnessPayload {
  status: 'ok' | 'error'
  runtimeMs?: number
  actual?: string
  error?: string
}

export type WorkerInbound =
  | { type: 'init'; pyodideBase: string }
  | { type: 'install'; code: string; functionName: string }
  | { type: 'run-one'; args: unknown[] }

export type WorkerOutbound =
  | { type: 'ready' }
  | { type: 'installed' }
  | { type: 'install-error'; error: string }
  | { type: 'result'; payload: HarnessPayload }
  | { type: 'fatal'; error: string }
