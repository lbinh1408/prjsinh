# Phase 3.3-C — Real StudySession Continuity Smoke V1

Status: DRAFT / NOT LOCKED. This is a **real-runtime control-branch smoke test**, not an adapter or checkpoint restoration proof.

## Run from the extracted package in your project root

`node scripts/runRealRuntimeContinuity.mjs ./src/session/studySession.js`

Change the path argument if your StudySession module is in a different directory. The module must be importable with its actual relative dependencies and ESM configuration. The script uses the actual exported `createStudySession`, `getSessionSnapshot`, `getStudentState`, and `completeLessonItem` APIs. It does not call QuestionSelector, AnswerEvaluator or LearningFlow; the chosen continuation is a content-item completion. It uses a synthetic minimal input, not a real saved checkpoint.

## What this establishes

- Real StudySession public APIs can be imported and used in the repository.
- Two copies of the same live session can continue identically through a real runtime method with fixed timestamps.
- The existing comparator detects deliberate `lastFlowResult` and masteryRuntime divergences.

## What it DOES NOT establish

- The 'restored' control branch is a clone of a live session, NOT a restored checkpoint.
- It does not prove an adapter can reconstruct excluded `dependencies`, `lastFlowResult`, `lessonRuntime.plan`, or full `attempts` from persistence.
- It does not exercise `submitAnswer`, real question content, or adaptive decisions.
- It does not prove atomic snapshot or verified provenance. No executable permission.

## Next requirement

Collect a **real** runtime snapshot at a safe boundary and a corresponding persisted checkpoint + attempt records + verified dependency bundle, then specify an authenticated sidecar format for the missing runtime fields or a narrow, proven derivation contract. Only then build and test a trusted adapter; do not mutate locked modules.
