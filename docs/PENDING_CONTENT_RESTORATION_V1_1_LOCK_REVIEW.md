# Phase 3.3-C — Pending Content Restoration V1.1: LOCK Review

**Decision: CONDITIONAL LOCK CANDIDATE — NOT YET LOCKED.**

## Evidence reported by project owner
- Pending Content Security Suite: **22/22 PASS**.
- Full Restoration unit regression: **326/326 PASS**, **0 failed**, **0 skipped**, reported duration **1472.163708 ms**.
- Real StudySession in-progress integration: **PASS** (last supplied output before the final test-only regression fix), with four operations: `complete:section-2`, `navigate:CONTENT`, `complete:section-3`, `navigate:PLAN_COMPLETE`.
- The 326/326 run is user-reported and not independently executed against the user's local repository by this review.

## Exact supported scope
- StudySession 0.2.0, pending lesson item `kind: 'content'` only.
- `currentSelection === null` and `currentQuestion === null`.
- Lesson plan must be READY, have unique section IDs, and agree with LessonEngine `getNextLessonItem({plan,progress})` navigation, including disposition `'include'` (lowercase).
- Pending item cannot already be completed or skipped.
- Capture-time and extension read-time semantic checks; checkpoint/extension binding and existing authenticated durable read remain required.
- Real content-lesson fixture demonstrated a four-step continuation match; this is not a universal behavioral proof.
- No change to LOCKED StudySession, LessonEngine, Persistence, Mastery, Knowledge Map, or Hydration Planning engines.

## Error contract in V1.1
- `PENDING_INVALID_CHECKPOINT`, `PENDING_QUESTION_STATE`, `PENDING_UNSUPPORTED_KIND`, `PENDING_INVALID_PLAN`, `PENDING_INVALID_PROGRESS`, `PENDING_AMBIGUOUS_SECTION`, `PENDING_NO_NEXT_ITEM`, `PENDING_NAVIGATION_MISMATCH`, `PENDING_ALREADY_RESOLVED`.
- These replace the old generic `SNAPSHOT_PENDING_DELIVERY` for the covered validation path. Downstream consumers must be reviewed before calling this an externally stable error API.
- No claim that every error code above has a distinct dedicated negative test; review test coverage individually if external stabilization is required.

## Explicit exclusions
- Pending `question_set`, `submitAnswer`, question/attempt continuation, mastery updates during restoration.
- Lesson-plan provenance derived from authenticated lesson/adaptive decision (navigation consistency alone is insufficient).
- Global/multi-process atomicity and any execution permission.
- No persisted schema upgrade: extension `schemaVersion` remains `1.0.0` in the V1.1 security patch.
- All guarded candidates remain `executable: false`.

## Release gates before marking LOCKED
1. Re-run real StudySession in-progress integration **after** the last test edits.
2. Re-run security suite and full 326-test restoration regression at the exact candidate Git revision.
3. Confirm `git status` / `git diff`, inspect changes to the two restoration source files and four regression test files, and ensure no LOCKED engines changed.
4. Confirm downstream users of `SNAPSHOT_PENDING_DELIVERY` accept new error codes or document compatibility policy.
5. Record Git commit SHA and source-file SHA-256 hashes; commit a LOCK manifest with evidence and exclusions.

## Proposed Git freeze workflow (user-run, not performed by this review)
```bash
node --test tests/unit/restoration/pendingContentRestorationSecurity.test.mjs
node --test tests/unit/restoration/*.test.mjs
node scripts/runInProgressRestorationIntegration.mjs ./src/engines/orchestration/studySession.js
git status --short
git diff --check
git diff -- src/restoration/pendingContentCaptureValidator.js src/restoration/restorationSnapshotExtension.js tests/unit/restoration
shasum -a 256 src/restoration/pendingContentCaptureValidator.js src/restoration/restorationSnapshotExtension.js tests/unit/restoration/pendingContentRestorationSecurity.test.mjs
```

**LOCK decision:** pending fresh final integration output, repository diff and commit SHA. No commit or tag has been created by the assistant.
