# content/problems

Source of truth for problem content. One JSON file per problem. Problems carry their commonly accepted names; descriptions, examples, constraints, and tests are re-authored with no verbatim LeetCode text. Plain technical language: array, list, value. No themed framing.

## Schema

The TypeScript schema lives in `src/content/types.ts` (`ProblemDraft`). Drafts carry inputs only:

- `id`, `title`, `track`, `difficulty`, `topics`, `source` (concept origin)
- `description`, `constraints`, `examples` (with stated outputs; the pipeline checks them against the reference solution)
- `parameters`, `functionName`, `starterCode`
- `hints` (exactly 3), `solution`, `solutionCode`, `bruteForceCode`
- `failureHint` (shown with hidden-test failure counts)
- `parTimeSec` (optional; defaults easy 300 / medium 720 / hard 1500)
- `expectedComplexity`
- `tests.visible[]` and `tests.hidden[]`, each `{ args }` plus an optional `failNote` on visible tests (the authored one-liner shown when that visible test fails)

Large test arrays sit on one long line so the surrounding file stays reviewable.

## Rules of thumb learned so far

- Every test must have exactly one valid answer. The pipeline catches violations: with two valid pairs, the optimal and brute-force references disagree (both are correct).
- Hidden sets need one large test, or the brute/optimal anchors never separate and the validator rejects the draft.
- Do not reformat drafts with `JSON.stringify`; it explodes arrays into thousands of lines. Keep them hand-formatted.

## Pipeline

`npm run content:build` (see `scripts/README.md`):

1. Draft (this directory).
2. Build step computes expected outputs by executing the optimal reference in Pyodide and measures runtime anchors.
3. Validator: schema completeness, test strength, phrasing originality, reference agreement, example consistency.
4. Human approval.

Generated bundles are written to `src/content/generated/` and committed.
