# Phase 3.3-C — Fenced Authenticated Durable Integration V1

Composition-only integration. No LOCKED engine changes. Requires all previous Phase 3.3-C restoration modules already installed.

## Guarantees within scope

- Cooperative in-process revision authority fences a detached StudySession snapshot.
- Fixture is assembled from that snapshot; HMAC signs a manifest-bound envelope.
- Real synchronous Durable Store performs a single-record CAS commit; immutable dependency blobs are written before envelope commit.
- Reopen by session ID, authenticate envelope BEFORE dependency loading and guarded reconstruction.
- Wrong key, stale capture and tampering fail closed. Returned candidate is ALWAYS `executable:false`.

## Not proven

- Mutation by code bypassing the authority, cross-process live capture atomicity, global multi-store atomic transactions, arbitrary power-loss resilience, production execution permit, or restoration of an actual in-progress delivery.
- If a callback changes revision during disk persistence, the envelope may already be committed. `fenceValidAfterCommit:false` is not a rollback.
- HMAC keys must be managed securely outside this test harness. Demo generates an ephemeral key and deletes the temp directory.

## Run

```sh
node --test tests/unit/restoration/fencedAuthenticatedDurableIntegration.test.mjs
node scripts/runFencedAuthenticatedDurableIntegration.mjs ./src/engines/orchestration/studySession.js
```
