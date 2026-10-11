# LearningFlow Evidence History Bridge V1 — DRAFT

## Root cause
`updateMastery()` returns `evidenceHistory` at the top level of its result. The existing `processAttempt()` runtime handoff read `masteryRuntimeResult.current.evidenceHistory`, silently replacing a valid history with `{}`. The next turn consequently could not reuse previous observations.

## Scope
- Changed: `engines/orchestration/learningFlow.js` (one property handoff and its comment).
- Added: `tests/regression/learningFlow.evidenceHistoryBridge.regression.test.mjs`.
- Unchanged: MasteryEngine, StudySession, AdaptiveEngine, rules, student state, persistence, question bank.

## Apply
1. Back up `src/engines/orchestration/learningFlow.js`.
2. Copy the bundled `engines/orchestration/learningFlow.js` to `src/engines/orchestration/learningFlow.js` (ONLY if this matches the source version supplied on 2026-10-11; review diff if IDE source changed).
3. Copy the test into `src/tests/regression/` if that matches your test layout; it expects the bundle's `engines/` structure, so if using project root `src`, put it at `src/tests/regression/`.
4. Run `node --test src/tests/regression/learningFlow.evidenceHistoryBridge.regression.test.mjs`.
5. Run your existing LearningFlow, StudySession, Mastery and persistence suites before enabling live sessions.

## Evidence and limits
The included tests are a source contract regression plus a representative handoff behavior test; they do NOT execute the complete 17-question runtime. A new fresh session and persisted history readback are required for end-to-end confirmation. Historical sessions already saved with empty history are not repaired by this patch. Do not manually alter LOCKED engines or persistent student state.

## Expected result
After two independently scored attempts, inspect `masteryRuntime.evidenceHistoryByNode.K283` and the sufficiency counter. If it still stays at one, inspect the input `masteryEvidenceHistory` and `evidenceContext.independence` for each turn. Mastery promotion remains governed by the existing policy and need not happen immediately.
