# PHASE 3.3 — HYDRATION & RESUME CONTRACT V1

**Status:** DESIGN DRAFT — NOT LOCKED, NOT IMPLEMENTED  
**Prerequisite:** Phase 3.2 Persistence V1 LOCKED (reported 260/260 tests PASS).

## 1. Objective and boundary

Reconstruct a **validated, detached restoration candidate** from a persisted checkpoint plus its ordered attempts, and eventually resume a StudySession **only after** a separately approved StudySession restoration interface exists.

Hydration must not mutate persisted data, call learning engines, recompute mastery, or silently advance the learning flow. A decoded checkpoint is **not** automatically a runnable StudySession.

## 2. Proposed components (new files only)

| Proposed path | Responsibility |
|---|---|
| `src/hydration/hydrationContract.js` | Versioned hydration request/result shapes and metadata |
| `src/hydration/hydrationValidator.js` | Structural, identity, attempt ordering and content-reference checks |
| `src/hydration/hydrationReader.js` | Read checkpoint and ordered attempts from existing public store APIs |
| `src/hydration/hydrationPlanner.js` | Produce validated restoration plan without executing session APIs |
| `tests/unit/hydration/*.test.js` | Contract and negative-path tests |
| `tests/integration/hydration/*.test.js` | Real K283 checkpoint/attempt verification |

**Deferred:** `sessionRestorer.js` or `resumeSession()` until the runtime restoration seam is formally approved.

## 3. Input contract (proposal)

```js
planHydration({
  sessionId,               // nonempty, exact identity
  expectedContentRefs,     // caller-supplied, trusted current refs
  checkpointStore,         // public getCheckpoint/getRevision API
  attemptStore             // public listAttemptIds/getAttempt API
});
```

No dependence on private store maps, mutable runtime closures, or serialization of engine functions.

## 4. Required validation gates

1. **Existence:** a checkpoint for `sessionId` must exist.
2. **Ownership:** checkpoint `runtime.sessionId` must exactly equal requested `sessionId`.
3. **Codec:** validate checkpoint through locked `checkpointCodec` public API; never weaken codec rules.
4. **Revision:** stored checkpoint revision must match the revision returned by the store at the time of the read; reject inconsistent observations.
5. **Attempt identity/order:** stored attempt IDs must match the checkpoint's persisted attempt IDs exactly, without missing, extra or reordered entries.
6. **Attempt payload ownership:** each loaded attempt must match its requested ID and session identity according to the existing AttemptStore contract.
7. **Content compatibility:** checkpoint content refs must match trusted current refs (id, version, hash) under a specified policy; mismatch blocks automatic resume.
8. **Runtime compatibility:** checkpoint format and StudySession runtime version must be supported by an explicitly declared compatibility matrix.
9. **State completeness:** required projected state and lesson/mastery evidence structures must be present and valid.
10. **Detached output:** changing the plan/result must not change either store or caller inputs.

**Consistency note:** Phase 3.2 stores do not offer an atomic cross-store read. A two-pass revision/ID recheck can detect some concurrent changes but does not guarantee a globally consistent snapshot. Document this limitation and require a durable transactional backend for stronger guarantees.

## 5. Output contract (proposal)

Success:

```js
{
  status: 'ready-for-restoration',
  sessionId,
  revision,
  checkpoint,           // validated detached projection
  attempts,             // detached ordered full attempt records
  contentRefs,          // validated refs from checkpoint
  runtimeVersion,
  warnings: [],
  executable: false     // no StudySession restoration seam yet
}
```

Failure: typed error with stable `code`, `message`, and non-sensitive `details`. Suggested codes:

- `HYDRATION_CHECKPOINT_NOT_FOUND`
- `HYDRATION_SESSION_MISMATCH`
- `HYDRATION_INVALID_CHECKPOINT`
- `HYDRATION_REVISION_MISMATCH`
- `HYDRATION_ATTEMPT_SEQUENCE_MISMATCH`
- `HYDRATION_ATTEMPT_PAYLOAD_MISMATCH`
- `HYDRATION_CONTENT_MISMATCH`
- `HYDRATION_UNSUPPORTED_VERSION`
- `HYDRATION_INCOMPLETE_STATE`
- `HYDRATION_READ_FAILED`

These names are **proposals**, not existing APIs.

## 6. Safety invariants

- **Fail closed:** never resume from partial, stale, mismatched or unsupported data.
- **No replay:** attempts are evidence to restore/validate, not commands to resubmit.
- **No duplicate mastery:** restoration must not call mastery update or learning flow.
- **No silent migrations:** a schema/version migration must be explicit, deterministic, tested and versioned.
- **No fabricated dependencies:** engine functions/content banks are loaded from trusted current application wiring, never from checkpoint JSON.
- **No mutation:** all reads and validation produce detached results.
- **No premature promise:** `ready-for-restoration` does not mean the session is resumed.

## 7. Test plan before implementation approval

| ID | Test |
|---|---|
| HYC-01 | Valid persisted real K283 session yields a detached plan |
| HYC-02 | Missing checkpoint fails closed |
| HYC-03 | Session identity mismatch fails |
| HYC-04 | Invalid checkpoint schema fails |
| HYC-05 | Revision mismatch during read fails |
| HYC-06 | Missing attempt fails |
| HYC-07 | Extra/reordered attempt fails |
| HYC-08 | Conflicting attempt payload identity fails |
| HYC-09 | Content hash/version mismatch fails |
| HYC-10 | Unsupported runtime version fails |
| HYC-11 | No engine or StudySession mutation during planning |
| HYC-12 | Returned plan mutation does not change stores |

## 8. Open contract questions (must resolve before coding)

1. Confirm the exact checkpoint property name for ordered attempt IDs (`attemptIds` versus `persistedAttemptIds`) from the locked codec, rather than guessing.
2. Confirm the shape returned by `attemptStore.getAttempt` and the checkpoint codec's public `validateCheckpoint`/`decodeCheckpoint` APIs.
3. Confirm whether `checkpointStore.getRevision` returns `0` for missing sessions and whether `getCheckpoint` returns `null` or another sentinel.
4. Define how to compare the entire set of content references and which source provides trusted current refs.
5. Specify supported checkpoint schema versions and StudySession runtime versions.
6. Determine the approved restoration seam for StudySession V0.2.0 without violating its LOCK.

## 9. Phase gates

**3.3-A — Contract freeze:** Resolve questions 1–6; approve error codes, request/result shapes and consistency limitations.

**3.3-B — Read-only hydration:** Implement reader/validator/planner and tests; no executable session restoration.

**3.3-C — Resume design:** Version and approve a StudySession restoration interface separately, with real K283 end-to-end tests.

**3.3-D — Persistence backend evolution (future):** Durable storage, transactions, and multi-process semantics are separate work; they are not implicitly solved by hydration.