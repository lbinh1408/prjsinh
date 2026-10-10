# Phase 3.3-C — Restoration Snapshot Extension Contract V1

**Status: DRAFT / NOT LOCKED / NOT EXECUTABLE**

## Goal
Capture continuity-only fields omitted from the existing checkpoint, without changing StudySession V0.2.0, CheckpointCodec V1 or Persistence V1.

## APIs
- `captureRestorationSnapshotExtension({ checkpoint, liveSnapshot })` expects a genuine `getSessionSnapshot(session)` result at the same logical instant as checkpoint creation. Caller must arrange this; this API does **not** provide atomic capture.
- `validateRestorationSnapshotExtension({ checkpoint, extension })` verifies structural binding and local integrity, returns a detached non-executable verdict.

## Envelope
`{ schemaVersion, checkpointBinding: { sessionId, revision, sha256 }, runtimeVersion, dependencyRefs, continuity: { lastFlowResult, lessonPlan, attempts }, continuitySha256, provenance, executable:false }`

All hashes in this extension are SHA-256 of sorted-key canonical JSON, UTF-8. This is **not** a replacement for C2's raw-byte content digest. The extension does not include raw dependency objects, and `dependencyRefs` are not cryptographically verified against their original content here.

## Preconditions
- Runtime must be active StudySession V0.2.0.
- All overlapping checkpoint/snapshot fields must match exactly (including runtime, config, state, currentDecision, lessonRuntime, history and masteryRuntime).
- Must be at a post-submitAnswer boundary with no pending question, selection or lesson item.
- All snapshot attempt IDs must align with checkpoint attempt IDs and session ID.
- For nonempty attempt history, lastFlowResult.adaptiveDecision.action must match currentDecision.action and final history.nextAction.
- Required dependency keys must exist in live snapshot; no dependency object is persisted in this extension.
- Content reference hashes must be syntactically valid and not the all-zero placeholder.

## Deliberate limitations
- `executable` always false. `runtimeContinuityVerified`, `contentIntegrityVerified`, and `atomicityGuaranteed` always false.
- A self-consistent but forged checkpoint+extension pair cannot be authenticated by these hashes. Trusted signing/storage and atomic snapshot capture remain open problems.
- Caller must independently verify dependency raw bytes with C2, plus prove all runtime dependencies are covered by refs. The fixture's reference map is illustrative, not a complete production manifest.
- This module does not invoke an adapter, replay attempts, or write to a store.
- Do not install the included `package.json` over your project's package.json; it exists solely for isolated test execution.

## Run
`node --test tests/unit/restoration/restorationSnapshotExtension.test.mjs`

## Next gate
Design and validate dependency coverage/provenance, atomic snapshot persistence, then behavioral equivalence on a real restored session. No C3 LOCK yet.
