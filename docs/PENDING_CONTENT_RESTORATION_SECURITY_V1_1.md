# Pending Content Restoration Security Test Suite V1.1

Status: DRAFT — NOT LOCKED. All guarded candidates `executable:false`.

## Scope

- Add semantic validation at authenticated **read** boundary in `validateRestorationSnapshotExtension` (after SHA-256 checkpoint binding and continuity checks).
- Correct actual LessonEngine disposition literal: `include` (lowercase).
- 22 unit/security tests using **real StudySession and LessonEngine** on the target repository. No edits to LOCKED engines.
- Tests verify capture, read, replay, navigation order, pending question rejection, tampering, and unkeyed hash rebinding.

## Install

From repository root, review then extract the archive into the repository. Back up local changes before overwriting files. Files included:

- `src/restoration/pendingContentCaptureValidator.js`
- `src/restoration/restorationSnapshotExtension.js`
- `tests/unit/restoration/pendingContentRestorationSecurity.test.mjs`

Run:

```bash
node --test tests/unit/restoration/pendingContentRestorationSecurity.test.mjs
node scripts/runInProgressRestorationIntegration.mjs ./src/engines/orchestration/studySession.js
```

Run existing restoration tests and all repository tests after these pass.

## Limits

These tests are not a proof of lesson-plan provenance, question/attempt restoration, execution authorization, or global atomicity. The SHA-256 rebinding tests validate **semantic** rejection only, not authentication; HMAC verification belongs to durable read integration. This patch retains schema version 1.0.0 for backward compatibility, and is called a V1.1 **security suite**, not a finalized new persisted schema. All results remain unverified until run on the real repository.
