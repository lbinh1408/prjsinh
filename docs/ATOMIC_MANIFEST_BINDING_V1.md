# Phase 3.3-C — Atomic Manifest Binding V1

## Scope
New additive `src/restoration/atomicManifestBinding.js`. No changes to locked StudySession, CheckpointCodec, or persistence engines. It builds on the existing `persistedReconstructionIntegration.js` design.

1. Validate reconstruction from caller-supplied checkpoint/extension and dependency bytes before writing.
2. Persist content-addressed dependency blobs and manifest; fsync the blob directory.
3. Embed `captureBinding` with `manifestSha256`, `sessionId`, and `revision` **inside the same Durable Atomic Store envelope** before CAS commit.
4. Reader requires only `rootDir` + `sessionId`, loads digest from the committed record, verifies manifest and blobs, and reconstructs guarded candidate.
5. Keep `executable:false` and `authenticatedCaptureProven:false`.

## Guarantees and non-guarantees
- Manifest pointer is atomically committed with checkpoint+extension in a **single durable record**; dependency blobs are prewritten and immutable. Orphan blobs may remain after failed commit.
- SHA-256 binds bytes for integrity, **not provenance/authentication**. An attacker with write access to the store can forge hashes and records. No MAC, signature, trust anchor, or capture authority is supplied.
- The caller's live snapshot is not acquired via a transactional StudySession API; **capture atomicity across runtime state and dependencies is not proven**.
- Durable Store's existing crash/concurrency limitations apply. This is not a production execution permit.
- Existing `persistGuardedCapture`/`readPersistedGuardedCapture` are left intact for backwards compatibility; new records must be read with `readBoundCapture`.

## Test
`node --test tests/unit/restoration/atomicManifestBinding.test.mjs`

## Integration
`node scripts/runAtomicManifestBindingIntegration.mjs ./src/engines/orchestration/studySession.js`

Requires the earlier `scripts/runPersistedReconstructionIntegration.mjs` and existing restoration modules in the repository.
