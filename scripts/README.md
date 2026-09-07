# scripts

Node scripts for the content pipeline. Entry point: `build-content.ts` (Phase 1 work, not written yet).

The pipeline runs the pinned `pyodide` npm package in Node, the same CPython-over-WASM runtime the app uses in the browser, so runtime anchors are measured in the same interpreter players get (Decision 5).

Commands will be documented here as the pipeline lands.
