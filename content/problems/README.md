# content/problems

Source of truth for problem content. One file per problem, re-authored per Decision 6: own names, descriptions, examples, constraints, and tests. No verbatim LeetCode text.

The schema lives in the DATA MODEL and CONTENT PIPELINE sections of `leetcode-game-scope.md`.

Pipeline (Decision 12):

1. Draft: description, examples, constraints, starter code, test inputs, hint ladder, brute-force and optimal reference solutions, `expectedComplexity`, `failureHint`.
2. Build step (`scripts/`): executes the optimal reference in Pyodide to compute expected outputs, measures brute-force and optimal runtime anchors against the hidden tests, and confirms both solutions agree on every output.
3. Validator: schema completeness, test strength (brute-force runtime must separate from optimal), phrasing originality.
4. Human approval.

Generated, verified problem bundles are written to `src/content/generated/` and committed, so the app build itself needs no Python step.

Nothing here yet. Phase 1 ships 8 problems, 2 per track (Decision 12).
