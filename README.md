# Restructured

A minimalist, DOS-styled video game for practicing algorithm problems. Pick a problem, read it, code a solution, run the tests, answer a Big-O quiz, and earn XP to unlock the next one. The game ships with 62 problems across eleven tracks, from Arrays to Dynamic Programming.

Play it at https://gabrielupcott.github.io/restructured/.

The game is local-first. Code runs in the browser through Pyodide (CPython compiled to WebAssembly), and progress is saved on your machine. There is no backend and no account system.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript |
| Build | Vite |
| Styling | Tailwind CSS 4 (DOS 16-color theme) |
| Code editor | Monaco, DOS themed, no autocomplete |
| Execution | Python via Pyodide in a Web Worker |
| Persistence | localStorage, local only |
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

## Deployment

A push to `main` runs `.github/workflows/deploy.yml`, which installs, builds, and publishes `dist/` to GitHub Pages. The Pages source must be set to GitHub Actions in the repo settings (one time). The base path `/restructured/` in `vite.config.ts` matches the project-page URL.

## Project structure

```
content/problems/    Problem drafts, one JSON per problem (inputs only, no expected outputs)
public/fonts/        Vendored VT323 font and its license
public/pyodide/      Pyodide runtime and pyflakes wheel, generated at predev/prebuild, gitignored
scripts/             Content pipeline + runtime copy scripts
src/components/      CodeEditor (Monaco, DOS theme), OptionsMenu, PalettePicker, SoundToggle, AdminPanel, ResizeHandle
src/content/         Schema types, content loader, generated/ (committed bundles)
src/execution/      Python test harness, Pyodide worker, main-thread runner
src/game/           XP, complexity ladder, runtime tiers, progress store, track grouping, player titles, sound synth, motion support, stopwatch
src/lib/             Small shared helpers
src/results/         Hidden-test reveal logic
src/screens/         MenuScreen (progress map, unlocks, records) and ProblemScreen with quiz + results
src/theme/           Palette presets, application, and persistence
```

The app loads problem bundles from `src/content/generated/`, which is committed, so the app build never runs Python. Run `npm run content:build` only after changing drafts.

## License

MIT. See [LICENSE](./LICENSE).
