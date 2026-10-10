# Phase 3.3-C — Persisted Checkpoint Restoration Integration V1

## Scope
- Writes content-addressed dependency blobs and manifest before committing the validated envelope to Durable Atomic Store V1.
- Reopens a new Durable Store instance, verifies manifest digest, revision, content hashes, reconstructs guarded candidate.
- Does not modify any LOCKED engine, grant execution, attest provenance, or prove atomicity across blob store and envelope store.
- The `manifestDigest` returned by `persistGuardedCapture` **must be retained** by the caller; it is NOT committed as a field of the durable envelope. A manifest hash alone is not an authenticated trust anchor.
- A failed commit can leave unreferenced blobs; garbage collection is out of scope.
- Use only in a trusted local directory; file ownership/permission hardening and crash fault injection beyond Durable Store tests are not certified.

## Integration
Copy ONLY these three paths into project root:
- `src/restoration/persistedReconstructionIntegration.js`
- `scripts/runPersistedReconstructionIntegration.mjs`
- `tests/unit/restoration/persistedReconstructionIntegration.test.mjs`

Existing modules required: `src/restoration/{durableAtomicStore,atomicCaptureProtocol,trustedRestorationAdapter,dependencyCoverageValidator,restorationSnapshotExtension,behavioralEquivalence}.js`.

Run:
```
node --test tests/unit/restoration/persistedReconstructionIntegration.test.mjs
node scripts/runPersistedReconstructionIntegration.mjs ./src/engines/orchestration/studySession.js
```

Expected integration output includes persisted reconstruction, structural comparison and one synthetic `completeLessonItem` step. A successful run is NOT proof of restoring a real interrupted study session.

## Next gate
Bind dependency manifest digest into the **same committed atomic record**, then authenticate capture provenance and verify real interrupted-session continuation before considering executable permission.
