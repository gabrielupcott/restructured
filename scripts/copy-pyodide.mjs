// Copies the pinned Pyodide runtime from node_modules into public/pyodide so
// the worker can load it same-origin at dev time and vite build ships it in
// dist. Runs automatically before `dev` and `build` (see package.json).
// Also vendors the pyflakes wheel used for editor linting.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const src = 'node_modules/pyodide'
const dest = 'public/pyodide'

const files = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]

mkdirSync(dest, { recursive: true })
for (const file of files) {
  copyFileSync(join(src, file), join(dest, file))
}
console.log('pyodide runtime copied to public/pyodide')

// Vendor the pyflakes wheel (pure Python, no dependencies) for in-worker
// linting. Cached: skipped when already present so offline builds work.
const wheelPath = join(dest, 'wheels', 'pyflakes.whl')
if (existsSync(wheelPath)) {
  console.log('pyflakes wheel already present')
} else {
  try {
    const response = await fetch('https://pypi.org/pypi/pyflakes/json')
    const data = await response.json()
    const wheel = data.urls.find(
      (url) => url.filename.endsWith('.whl') && url.filename.includes('py2.py3-none-any'),
    )
    if (!wheel) throw new Error('no wheel found in the PyPI response')
    mkdirSync(join(dest, 'wheels'), { recursive: true })
    const buffer = Buffer.from(await fetch(wheel.url).then((r) => r.arrayBuffer()))
    writeFileSync(wheelPath, buffer)
    console.log(`pyflakes wheel vendored (${wheel.filename})`)
  } catch (error) {
    console.warn(
      `pyflakes wheel unavailable; editor linting will be disabled (${error.message})`,
    )
  }
}
