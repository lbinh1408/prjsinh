# Phase 3.3-B — Final Gap Closure

Copy `tests/integration/hydration/hydrationGapClosure.test.js` into the matching repo path. Reuse existing `tests/fixtures/hydration/k283-checkpoint.json` and `k283-attempts.json`.

Run:
`node --test tests/integration/hydration/hydrationGapClosure.test.js`

Then run full suite:
`node --test tests/unit/hydration/*.test.js tests/integration/hydration/*.test.js`

Five additional cases: HYC-04, HYC-10 codec precedence, HYC-07 reordered IDs, HYC-24 incomplete lesson progress, HYC-27 error sanitization/no partial return.

HYC-11 no-engine-call is a source/import-boundary review item, not proven by a store-write spy. HYC-01 real StudySession capture provenance remains unproven. The two-pass non-atomic, payload race, and SHA placeholder limitations require explicit sign-off. Record commit SHA and hashes for all four hydration modules and tests, and capture exact test totals. Do not mark LOCKED before those sign-offs.
