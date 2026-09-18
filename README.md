# Restructured

A minimalist, DOS-styled video game for practicing algorithm problems. Pick a problem, read it, code a solution in the browser, run the tests, answer a Big-O quiz, earn XP, and unlock the next problem on the track.

Local-first: a static site where all execution happens in the browser and progress is saved locally. There is no backend and no accounts.

## Status

Alpha 1 shipped the core loop: eight verified problems across four tracks, a DOS-themed Monaco editor with pyflakes linting, run and submit with a stop control, per-test wall-clock timeouts with sandbox-reset recovery, tiered hidden-test feedback, and the palette system with presets plus custom colors.

Alpha 2 added the game mechanics. Challenge and Practice modes share a timer that never pauses; once it passes par it keeps counting and flags OVERTIME. A three-hint ladder can end in a full solution reveal, and every accepted solve finishes with a Big-O quiz and the improve-it loop. XP takes modifiers for revealed hints and the quiz result. Later problems on a track unlock as earlier ones are solved, personal records are kept per mode, streaks are display-only, and the last 20 submissions per problem stay on the machine, viewable and restorable from the problem screen. All progress lives in `localStorage`.

Alpha 3 added the personality. Every track carries an accent hue and an ASCII motif, and they follow the track everywhere: progress map, menu, problem screen, quiz, and results panel. The menu is the progress map, chaining track nodes in the suggested curriculum order with dashed connectors into the coming-soon Phase 4 tracks; progress bars sit in a fixed vertical rail on wide screens and a top row on narrow ones. Total XP maps to a cosmetic player title shown on the menu and the results screen.

Sound comes from a local square-wave synth with a persisted mute toggle. It covers runs, per-test results, submits, the quiz, hints, overtime, unlocks, and the boot sequence. Motion covers the rest: a once-per-session skippable boot sequence synced to its jingle, 150ms screen fades, an XP count-up with a tier stamp, an OVERTIME blink, chip pop and shake, hint slide-ins, and button press states. Everything renders statically under `prefers-reduced-motion`.

Beta 1 filled in the rest of the content: 62 verified problems across all eleven tracks of the planned curriculum, with 11 hard problems and a capstone closing out most tracks. Problems inside a track follow a teaching order, and solving one unlocks the next. Linked lists, trees, and graphs hand you real node objects now, and solutions that mutate their input get a fresh copy for every timed run.

The progress map handles the size. Hovering a bar in the side rail lists a track's problems and marks which ones you have solved, clicking a bar jumps to that section, and a section can collapse out of the way. The top-right controls consolidated into an options menu that exports your save to a file, imports a save back, and clears local progress behind a two-click confirm. The palette picker stays one click beside the menu.

For testing, a hidden admin panel plays every sound and edits progress. Type `iddqd` on any screen and an ADMIN button appears on the home screen.

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

## Deployment

The site deploys to GitHub Pages at `https://gabrielupcott.github.io/restructured/`. A push to `main` runs `.github/workflows/deploy.yml`, which installs, builds, and publishes `dist/`. The Pages source must be set to GitHub Actions in the repo settings (one time). The base path `/restructured/` is set in `vite.config.ts` to match the project-page URL.

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
