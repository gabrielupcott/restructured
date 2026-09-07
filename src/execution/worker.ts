/**
 * Pyodide worker: a persistent worker that installs solution
 * code once per run and executes one test at a time. Pyodide itself is loaded
 * same-origin from public/pyodide/ (copied from the pinned npm package).
 */
import harnessSource from './harness.py?raw'
import type { WorkerInbound, WorkerOutbound } from './protocol'

interface PyodideLike {
  runPythonAsync(source: string): Promise<unknown>
  globals: { set(name: string, value: unknown): void }
}

let pyodide: PyodideLike | null = null

function post(message: WorkerOutbound): void {
  ;(self as unknown as { postMessage(message: WorkerOutbound): void }).postMessage(message)
}

async function initPyodide(base: string): Promise<void> {
  const module = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as {
    loadPyodide(options: { indexURL: string }): Promise<PyodideLike>
  }
  pyodide = await module.loadPyodide({ indexURL: base })
  await pyodide.runPythonAsync(harnessSource)
}

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const message = event.data
  try {
    if (message.type === 'init') {
      await initPyodide(message.pyodideBase)
      post({ type: 'ready' })
    } else if (message.type === 'install') {
      pyodide!.globals.set('__CODE', message.code)
      pyodide!.globals.set('__FN', message.functionName)
      try {
        await pyodide!.runPythonAsync('install_solution()')
        post({ type: 'installed' })
      } catch (error) {
        post({ type: 'install-error', error: String(error) })
      }
    } else if (message.type === 'run-one') {
      pyodide!.globals.set('__ARGS_JSON', JSON.stringify(message.args))
      const raw = await pyodide!.runPythonAsync('run_one()')
      post({ type: 'result', payload: JSON.parse(String(raw)) })
    }
  } catch (error) {
    post({ type: 'fatal', error: String(error) })
  }
}
