# PHASE 3.2 — PERSISTENCE V1 LOCK REPORT

**Status:** LOCKED — contract and behavior scope validated by reported tests  
**Date:** 2026-10-08  
**Evidence:** User-reported full regression run: **260/260 PASS** (175 persistence unit, 75 K283 integration, 10 final consistency audit). This report records the reported result; it is not an independent execution log.

## 1. Locked modules

| Module | Scope |
|---|---|
| `src/persistence/checkpointCodec.js` | Checkpoint encoding, decoding, validation and projections |
| `src/persistence/attemptStore.js` | In-memory attempt append, retrieval, ordering and idempotency |
| `src/persistence/checkpointStore.js` | In-memory checkpoint save, CAS revisions, ownership and idempotency |
| `src/persistence/persistenceCoordinator.js` | Attempts-first write orchestration, reconciliation, snapshot retrieval |

Existing `StudySession V0.2.0` and `Mastery Engine V2` remain LOCKED independently.

## 2. Verified test inventory

| Suite | Passed |
|---|---:|
| CheckpointCodec unit | 30/30 |
| AttemptStore unit | 40/40 |
| CheckpointStore unit | 50/50 |
| PersistenceCoordinator unit | 55/55 |
| K283 integration | 75/75 |
| Final Consistency Audit | 10/10 |
| **Total** | **260/260** |

The audit covered: attempt write-then-throw; checkpoint write-then-throw; duplicate attempt ID with conflicting payload; non-prefix attempt sequences; stale CAS; sequential competing writers; attempts-first checkpoint references; retry after checkpoint failure; detached copies; and capability metadata.

## 3. Contract invariants

1. Persisted attempt IDs must match the StudySession attempt sequence in order.
2. Attempts are appended before a checkpoint referencing them is saved.
3. A checkpoint update uses expected revision (CAS); conflicting writes cannot replace a committed checkpoint.
4. An exact retry is idempotent. Conflicting attempt payloads are rejected.
5. Checkpoint and attempt data returned to callers are detached from store internals.
6. Checkpoint projections exclude non-persisted live dependencies and must not be interpreted as a runnable StudySession.
7. Coordinator snapshot retrieval is **read-only retrieval**, not hydration.

### Error semantics

- A revision conflict detected during Coordinator preflight may produce `PERSISTENCE_REVISION_CONFLICT`.
- A revision conflict detected inside CheckpointStore during a write produces `PERSISTENCE_WRITE_FAILED` with `cause.code = CHECKPOINT_REVISION_CONFLICT`.
- Callers must inspect `cause` for a wrapped write error. Do not silently normalize or change these error contracts during Phase 3.3.

## 4. Capability limits

- Storage is **in-memory**, not durable across process restarts.
- No transaction spanning AttemptStore and CheckpointStore.
- No distributed or multi-process concurrency guarantee; the competing-writer audit is sequential/in-process.
- No hydration, runtime reconstruction, or session resume API in Phase 3.2.
- `supportsHydration`, `supportsResume`, and persistence/durability metadata must continue to reflect the actual implementation.

## 5. Lock policy

**Do not modify** the four modules to implement Phase 3.3. Prefer new hydration-specific adapters, validators, and services that consume public read APIs. A change to a locked contract requires an explicit versioned change request, migration analysis, and a complete regression run.

Do not modify StudySession V0.2.0 or Mastery Engine V2 implicitly. If resume requires a new runtime constructor or controlled restoration seam, specify and approve it as a separate versioned contract.

## 6. Required regression command

```bash
node --test \
  tests/unit/persistence/*.test.js \
  tests/integration/studySession.lesson.learningflow.integration.test.js \
  tests/integration/persistence/persistenceCoordinator.finalConsistency.audit.test.js
```

**Phase 3.2 disposition:** LOCKED within the tested in-memory scope. **Next:** Phase 3.3 Hydration Contract V1 — design first, implementation gated.