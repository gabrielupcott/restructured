# Restructured

A minimalist, DOS-styled video game for practicing algorithm problems. Pick a problem, read it, code a solution in the browser, run tests, answer a Big-O quiz, earn XP, and unlock the next problem on the track.

Local-first: static site, all execution in the browser, progress saved locally. No backend, no accounts.

## Status

Alpha 1 is complete: eight verified problems across four tracks, the DOS-themed Monaco editor with pyflakes linting, run and submit with a stop control, per-test wall-clock timeouts with sandbox-reset recovery, tiered hidden-test feedback, and the palette system with presets plus custom colors. Next up: the game mechanics (timer, XP, Big-O quiz, progression, records).

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript |
| Build | Vite |
| Styling | Tailwind CSS 4 (DOS 16-color theme) |
| Code editor | Monaco, DOS themed, no autocomplete |
| Execution | Python via Pyodide in a Web Worker |
| Persistence | IndexedDB / localStorage, local only |
| Tests | Vitest |
| Hosting | Static: GitHub Pages |

## Getting started

Requires Node 20.19+ or 22.12+ (Vite 7 requirement). Development uses Node 22 LTS.

```
npm install
npm run dev           # dev server (copies the Pyodide runtime to public/pyodide first)
npm run build         # copy runtime + typecheck + production build
npm run preview       # serve the production build
npm run test          # vitest
npm run lint          # eslint
npm run typecheck     # tsc
npm run content:build # verify problem drafts, compute outputs + anchors, write generated bundles
```

## Project structure

```
content/problems/    Problem drafts, one JSON per problem (inputs only, no expected outputs)
public/fonts/        Vendored VT323 font and its license
public/pyodide/      Pyodide runtime and pyflakes wheel, generated at predev/prebuild, gitignored
scripts/             Content pipeline + runtime copy scripts
src/components/      CodeEditor (Monaco, DOS theme) and PalettePicker
src/content/         Schema types, content loader, generated/ (committed bundles)
src/execution/      Python test harness, Pyodide worker, main-thread runner
src/lib/             Small shared helpers
src/results/         Hidden-test reveal logic
src/screens/         ProblemScreen
src/theme/           Palette presets, application, and persistence
```

The app loads problem bundles from `src/content/generated/`, which is committed, so the app build never runs Python. Run `npm run content:build` only after changing drafts.


## License

MIT. See [LICENSE](./LICENSE).
