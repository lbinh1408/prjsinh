# Phase 3.3-C — Authenticated Persisted Restoration Integration V1

## Scope

This module bridges existing immutable-manifest durable persistence with pre-authentication read. It does **not** modify LOCKED StudySession, CheckpointCodec, or Persistence engines.

### Write

1. Construct a guarded fixture from a caller-supplied snapshot (the caller is responsible for consistency).
2. Compute dependency blob hashes and the exact persisted manifest hash.
3. Bind manifest hash to envelope, then HMAC-sign that **bound** envelope.
4. Persist dependency blobs and manifest before atomic envelope commit.

### Read

1. Read committed envelope without reading dependency blobs.
2. Verify HMAC, key ID, session ID and revision.
3. Re-read bound record, check it did not change, then load manifest and dependency bytes.
4. Reconstruct a guarded candidate; never grant execution permission.

### Security / correctness boundaries

- HMAC key must be kept outside persisted artifacts. The sample integration runner generates an ephemeral 32-byte key and is not a production key-management system.
- HMAC authenticates a claim by the key holder; it does not establish true live snapshot atomicity, external trust in the key holder, or rollback resistance. A valid old signed revision could be replayed by a party controlling the entire store unless independently anchored.
- The read boundary performs durable record parsing and structural envelope validation before HMAC. It **does not** load dependency blobs or reconstruct a candidate before HMAC verification.
- This version uses the existing blob store, which has no cross-process transaction covering blobs and envelope. Orphan blobs are possible after interrupted writes.
- Synthetic continuation test is one step only. No live in-flight session restoration or execution permit is proven.
- All results remain `executable:false` and `atomicityProven:false`.

### Run in project root

```bash
node --test tests/unit/restoration/authenticatedPersistedIntegration.test.mjs
node scripts/runAuthenticatedPersistedIntegration.mjs ./src/engines/orchestration/studySession.js
```

### Files

- `src/restoration/authenticatedPersistedIntegration.js`
- `tests/unit/restoration/authenticatedPersistedIntegration.test.mjs`
- `scripts/runAuthenticatedPersistedIntegration.mjs`
- `docs/AUTHENTICATED_PERSISTED_INTEGRATION_V1.md`
