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
  FS: { writeFile(path: string, data: Uint8Array): void }
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
  await installPyflakes(base)
}

/** Extracts the vendored wheel into site-packages so pyflakes imports work. */
async function installPyflakes(base: string): Promise<void> {
  try {
    const wheel = await fetch(`${base}wheels/pyflakes.whl`)
    if (!wheel.ok) throw new Error(`wheel fetch failed with status ${wheel.status}`)
    pyodide!.FS.writeFile('/pyflakes.whl', new Uint8Array(await wheel.arrayBuffer()))
    pyodide!.globals.set('__WHEEL_PATH', '/pyflakes.whl')
    await pyodide!.runPythonAsync('install_pyflakes()')
  } catch (error) {
    console.warn('pyflakes unavailable; editor linting disabled:', error)
  }
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
    } else if (message.type === 'lint') {
      pyodide!.globals.set('__LINT_CODE', message.code)
      const raw = await pyodide!.runPythonAsync('lint_one()')
      post({ type: 'lint-result', diagnostics: JSON.parse(String(raw)) })
    }
  } catch (error) {
    post({ type: 'fatal', error: String(error) })
  }
}
