# scripts

Node scripts for the content pipeline and asset handling. These steps implement the pipeline described in leetcode-game-scope.md.

## Commands

```
npm run content:build        # verify drafts, compute expected outputs + anchors, write src/content/generated/problems.ts
node scripts/copy-pyodide.mjs  # copy the pinned Pyodide runtime to public/pyodide (runs automatically before dev/build)
```

## build-content.ts

Implements the content pipeline. Reads every draft in `content/problems/*.json` and:

1. Validates schema completeness (required fields, 3-hint ladder, function names present in all code blocks).
2. Checks phrasing originality against a blocklist of canonical LeetCode boilerplate prose.
3. Executes the optimal and brute-force reference solutions in Pyodide (Node) against every test input; both references must agree on every output, and each example's stated output must match the computed output.
4. Measures runtime anchors on the hidden tests and enforces test strength: on the largest hidden test, brute force must be at least 3x slower than optimal (or at least 5ms slower), and the brute-force total must stay under the 4s budget.
5. Writes `src/content/generated/problems.ts`, which is committed and typechecked against `src/content/types.ts`.

The separation threshold (3x) and its 5ms absolute fallback are validator constants chosen to be deliberately conservative so anchor tiers only render when the measurement is trustworthy.

The pipeline runs the same Python harness (`src/execution/harness.py`) the browser worker uses, from the same pinned `pyodide` npm package, so anchors are measured in the same interpreter players get.

## copy-pyodide.mjs

Copies `pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, and `pyodide-lock.json` from `node_modules/pyodide` to `public/pyodide` so the worker loads Python same-origin with no CDN. Gitignored; regenerated on every dev/build.
