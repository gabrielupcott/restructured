# Restructured

A minimalist, DOS-styled video game for practicing algorithm problems. Pick a problem, read it, code a solution in the browser, run tests, answer a Big-O quiz, earn XP, and unlock the next problem on the track.

Local-first: static site, all execution in the browser, progress saved locally. No backend, no accounts.

The full product scope and the 14 binding decisions live in [leetcode-game-scope.md](./leetcode-game-scope.md).

## Status

Pre-MVP. Current phase: Phase 1, the coding prototype (problem, editor, run, tests, pass/fail).

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript |
| Build | Vite |
| Styling | Tailwind CSS 4 (DOS 16-color theme is Phase 1 work, Decision 10) |
| Code editor | Monaco, DOS themed, no autocomplete (Decision 10) |
| Execution | Python via Pyodide in a Web Worker (Decision 2, Decision 13) |
| Persistence | IndexedDB / localStorage, local only (Decision 1) |
| Tests | Vitest |
| Hosting | Static: GitHub Pages |

## Getting started

Requires Node 20.19+ or 22.12+ (Vite 7 requirement). Development uses Node 22 LTS.

```
npm install
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run test       # vitest
npm run lint       # eslint
npm run typecheck  # tsc
```

## Project structure

```
content/problems/   Problem drafts, one file per problem (schema in the scope doc)
public/             Static assets served as-is
scripts/            Content pipeline: computes expected outputs, runtime anchors, validation
src/                Application source: screens, components, the Pyodide execution
                    worker, local progress storage, generated content bundles
```

Verified problem bundles land in `src/content/generated/` and are committed (Decision 17), so the app build never runs Python.

## License

MIT. See [LICENSE](./LICENSE).
