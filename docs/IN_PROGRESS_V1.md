# Phase 3.3-C — In-Progress Session Restoration & Multi-Step Behavioral Equivalence V1

This is an additive, guarded integration test; no LOCKED modules are changed.

## Installation
Extract the ZIP at repository root. Requires previous Phase 3.3-C packages including `runPersistedReconstructionIntegration.mjs`, `fencedAuthenticatedDurableIntegration.js`, and related modules.

## Commands
`node --test tests/unit/restoration/inProgressContinuation.test.mjs`

`node scripts/runInProgressRestorationIntegration.mjs ./src/engines/orchestration/studySession.js`

The runner creates a real StudySession, uses public `getNextStudyItem` and `completeLessonItem` APIs to generate progress and a pending item, captures through a cooperative revision authority, commits through the durable authenticated store, reloads and reconstructs, then compares four subsequent real API operations. It deliberately does not fabricate a pending item in a restored candidate.

## Boundaries
The fixture is content-only. Question-set/submitAnswer, Attempt→LearningFlow, real mastery updates, process-global atomicity, and authenticated execution authorization are NOT proven. Failure of the real runner may mean the lesson fixture does not meet the actual LessonPlan contract: do not bypass with manual currentItem injection. `executable:false` throughout.
