// Copies the pinned Pyodide runtime from node_modules into public/pyodide so
// the worker can load it same-origin at dev time and vite build ships it in
// dist. Runs automatically before `dev` and `build` (see package.json).
import { copyFileSync, mkdirSync } from 'node:fs'
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
