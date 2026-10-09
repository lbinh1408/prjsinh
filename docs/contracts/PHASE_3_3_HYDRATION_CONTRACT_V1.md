# PHASE 3.3 — HYDRATION & RESUME CONTRACT V1

**Status:** REVIEW CANDIDATE — NOT LOCKED, NOT IMPLEMENTED  
**Scope:** Phase 3.3-A contract definition and Phase 3.3-B read-only hydration  
**Prerequisite:** Phase 3.2 Persistence V1 LOCKED (260/260 PASS reported previously; not rerun for this document)  
**Source baseline:** `checkpointCodec.js`, `attemptStore.js`, `checkpointStore.js`, `persistenceCoordinator.js`, `studySession.js` V0.2.0  
**Change policy:** Add new hydration files only; do not modify LOCKED components.

## 1. Objective, definitions, and non-goals

Hydration reads one persisted checkpoint and the ordered attempts belonging to its session; validates structural, identity, consistency, content-reference and version constraints; and produces a **detached, non-executable restoration candidate**.

- **Hydration:** read, validate, and plan; no runtime execution.
- **Restoration candidate:** validated data projection; not a StudySession instance.
- **Resume:** construction of a runnable StudySession from a candidate; **out of scope** until Phase 3.3-C approves a restoration interface and continuity policy.
- **Trusted current refs:** independently supplied content-reference manifest from application wiring; never inferred from the checkpoint itself.

Hydration MUST NOT call `createStudySession()`, `getNextStudyItem()`, `getNextQuestion()`, `submitAnswer()`, `completeLessonItem()`, `processAttempt()`, or any mastery/adaptive/lesson execution engine. It MUST NOT replay attempts, mutate stores, recalculate mastery/evidence, fabricate dependencies, or silently migrate versions.

The Phase 3.2 stores are in-memory and do **not** establish durable, transactional or cross-process persistence.

## 2. Verified source contracts

The following facts were verified against the supplied source files; they are **existing APIs**, not new hydration APIs.

| Source | Verified interface / behavior |
|---|---|
| `checkpointCodec.js` | `CHECKPOINT_CODEC_INFO.version === '1.0.0-draft'`; `validateCheckpoint(checkpoint)` returns `true` or throws; `decodeCheckpoint(input)` accepts object/JSON text, validates, returns detached object |
| Checkpoint projection | Ordered attempt IDs are `checkpoint.attemptIds` (not `persistedAttemptIds`); `persistedAttemptIds` is an **encoder argument** |
| Checkpoint omissions | Excludes `dependencies`, `attempts`, `lastFlowResult`, and `lessonRuntime.plan` |
| `attemptStore.js` | `getAttempt({sessionId,attemptId})` returns detached attempt or `null`; `listAttemptIds({sessionId})` returns IDs in insertion order |
| `checkpointStore.js` | `getCheckpoint({sessionId})` returns detached checkpoint or `null`; `getRevision({sessionId})` returns revision or `0` for missing session |
| `studySession.js` | `STUDY_SESSION_INFO`: `name='StudySession'`, `version='0.2.0'`, `studentStateVersion='1.2.0'`; no public restoration API |

Codec validation checks the **format** of content SHA-256 values, not the actual hash of loaded content. AttemptStore validates its own storage contract but does not prove every full canonical AttemptBuilder invariant.

## 3. Files and ownership

| New path | Responsibility |
|---|---|
| `src/hydration/hydrationContract.js` | Version metadata, compatibility policy, stable errors, request/result contract |
| `src/hydration/hydrationReader.js` | Public-store reads, ordered attempt loading, two-pass observation and read errors |
| `src/hydration/hydrationValidator.js` | Codec validation plus hydration-specific checks; no store mutation |
| `src/hydration/hydrationPlanner.js` | Orchestrate read/validate and build detached candidate; expose `planHydration` |
| `tests/unit/hydration/*.test.js` | Unit, contract and failure-path tests |
| `tests/integration/hydration/*.test.js` | Real K283 persisted-session tests |

Deferred: `sessionRestorer.js`, `restoreStudySession()`, `resumeSession()`, durable backend and migrations. These are **not** implied by this contract.

## 4. Public input contract (new, proposed)

```js
planHydration({
  sessionId,
  expectedContentRefs,
  checkpointStore,
  attemptStore
});
```

- `sessionId`: nonempty string; exact, case-sensitive comparison; do not trim/normalize a valid ID before lookup.
- `expectedContentRefs`: nonempty plain JSON-compatible object with `{ [key]: { id, version, sha256 } }`; supplied independently by trusted caller/application wiring. Never use checkpoint refs as the expected refs.
- `checkpointStore`: object exposing callable `getCheckpoint({sessionId})` and `getRevision({sessionId})`.
- `attemptStore`: object exposing callable `listAttemptIds({sessionId})` and `getAttempt({sessionId,attemptId})`.
- No private store maps, filesystem assumptions, hidden engine closures, or dependency injection from checkpoint JSON.
- Invalid arguments fail with `HYDRATION_INVALID_REQUEST` **before** store reads.
- V1 is synchronous because the verified store APIs are synchronous. Async backend support requires a new contract/version.

### 4.1 Compatibility matrix (V1 policy)

```js
{
  checkpointSchemaVersions: ['1.0.0-draft'],
  runtime: {
    name: 'StudySession',
    versions: ['0.2.0']
  },
  studentStateSchemaVersions: ['1.2.0']
}
```

Use the checkpoint's `schemaVersion`, `runtime.name`, `runtime.version`, and `state.schemaVersion`. Any absent or unsupported value is rejected. This is a **proposed allowlist**, derived from verified source versions; it does not imply that runnable restoration is supported. Do not silently accept other versions or mutate this matrix from caller input.

## 5. Read protocol and consistency boundary

`hydrationReader` MUST read through public store methods only:

1. Read `revisionBefore = checkpointStore.getRevision({sessionId})`.
2. Read `checkpointBefore = checkpointStore.getCheckpoint({sessionId})`; reject `null`.
3. Read `idsBefore = attemptStore.listAttemptIds({sessionId})`.
4. Validate checkpoint enough to safely obtain `checkpoint.attemptIds`; require `idsBefore` to match exactly (same length, same ID at each index).
5. Load each payload in checkpoint order using `getAttempt({sessionId,attemptId})`; reject missing or inconsistent payloads.
6. Read `revisionAfter`, `checkpointAfter`, `idsAfter` using the same public APIs.
7. Require equal revisions, each checkpoint's `revision` equal to the corresponding store revision, equal ID sequences, and a structurally equal checkpoint observation (canonical JSON value equality, not object identity). Reject any detected inconsistency.
8. Validate the full detached candidate and return it only if every gate passes.

**Limits:** The second pass detects many but not all concurrent modifications. Attempt payloads are not atomically snapshotted with checkpoints. An ABA change or payload replacement between reads may remain undetected. No global atomicity or linearizability is claimed. V1 is intended for quiescent in-memory stores; stronger consistency requires transactional backend evolution.

### 5.1 Orphan-attempt policy — H-DEC-01

**Strict equality in V1.** `attemptStore.listAttemptIds({sessionId})` MUST exactly equal `checkpoint.attemptIds`, including order. Extra, missing, duplicated or reordered IDs reject hydration with `HYDRATION_ATTEMPT_SEQUENCE_MISMATCH`.

A failed checkpoint write may leave an orphan attempt. Hydration MUST NOT delete, replay, repair or silently ignore it. Recovery/garbage collection is a separate, explicit future policy. Empty arrays on both sides are valid.

## 6. Validation gates (all mandatory)

| Gate | Requirement | Failure code |
|---|---|---|
| G01 | Request and required store methods valid | `HYDRATION_INVALID_REQUEST` |
| G02 | Checkpoint exists | `HYDRATION_CHECKPOINT_NOT_FOUND` |
| G03 | `decodeCheckpoint`/`validateCheckpoint` accepts checkpoint | `HYDRATION_INVALID_CHECKPOINT` |
| G04 | `checkpoint.runtime.sessionId === sessionId` | `HYDRATION_SESSION_MISMATCH` |
| G05 | Two-pass checkpoint/revision observations agree | `HYDRATION_REVISION_MISMATCH` |
| G06 | Store attempt IDs exactly equal checkpoint IDs in order | `HYDRATION_ATTEMPT_SEQUENCE_MISMATCH` |
| G07 | Each payload exists; `attempt.attemptId` and `attempt.sessionId` exactly match | `HYDRATION_ATTEMPT_PAYLOAD_MISMATCH` |
| G08 | Trusted expected refs exactly match checkpoint refs | `HYDRATION_CONTENT_MISMATCH` |
| G09 | Schema/runtime/student-state versions supported | `HYDRATION_UNSUPPORTED_VERSION` |
| G10 | Required state/config/decision/lesson/mastery projections meet V1 completeness policy | `HYDRATION_INCOMPLETE_STATE` |
| G11 | Returned result fully detached from both stores and caller inputs | `HYDRATION_PLAN_INVALID` |

**Failure precedence:** G01 before reads; missing checkpoint before codec validation; malformed checkpoint before identity/version checks; inconsistency during reads before building the plan. For multiple semantic failures in one otherwise stable snapshot, apply G04, G06, G07, G08, G09, G10 in that order. A store exception is `HYDRATION_READ_FAILED` unless it is a deliberately raised typed hydration rejection. This ordering is part of the V1 test contract.

### 6.1 Content reference policy — H-DEC-03

- Require exact same key set (no missing or extra keys).
- For each key, require exact `id` and `version` strings and SHA-256 hex equality **case-insensitively** (hex case does not change digest value).
- Validate both manifests' shapes; malformed caller manifest is `HYDRATION_INVALID_REQUEST`; malformed checkpoint manifest is `HYDRATION_INVALID_CHECKPOINT`.
- Do not fetch content, recompute hashes, infer missing references, migrate versions or fall back to a different manifest.
- Successful comparison means **reference compatibility only**, not verified integrity of actual content bytes. `contentIntegrityVerified` MUST be `false` in V1.

### 6.2 State completeness policy

After codec validation, require at minimum:

- `checkpoint.runtime` contains the expected identity, supported version, valid `status` string, and nonempty timestamp strings (`startedAt`, `lastActivityAt`).
- `checkpoint.config` is a non-array object with a positive safe-integer `historyLimit` and the expected session configuration fields `learningMode`, `timeBudget`, `clusterId`, `lessonId`, `contextId` (nullable fields permitted where used by StudySession).
- `checkpoint.state` is a non-array object with `schemaVersion === '1.2.0'`, and object-shaped `learning` and `knowledge` projections; `state.learning.session.sessionId` must match the requested ID when that projection is present.
- `checkpoint.currentDecision` is a non-array object with a nonempty `action` string; its full AdaptiveDecision semantic validity is **not** certified by hydration.
- `checkpoint.lessonRuntime.currentItem` is `null` or a non-array object; `progress.completedSectionIds` and `progress.skippedSectionIds` are arrays of unique, nonempty strings, with no section ID in both arrays.
- `checkpoint.masteryRuntime.evidenceHistoryByNode` is a non-array object.
- `checkpoint.history` is an array, bounded by `checkpoint.config.historyLimit`.

The above are hydration-specific **minimum checks**, not a claim of full Student State, LessonEngine or Mastery Engine semantic validation. Any stronger validator must be separately verified and explicitly added to this contract; do not invent its API.

## 7. Output and error contract (new, proposed)

### 7.1 Success: synchronous return value

```js
{
  status: 'ready-for-restoration',
  sessionId: 'session-example',
  revision: 1,
  checkpoint: { /* validated detached checkpoint */ },
  attempts: [ /* full detached attempts, checkpoint order */ ],
  contentRefs: { /* validated detached checkpoint refs */ },
  runtimeVersion: '0.2.0',
  compatibility: {
    checkpointSchemaVersion: '1.0.0-draft',
    runtimeName: 'StudySession',
    runtimeVersion: '0.2.0',
    studentStateSchemaVersion: '1.2.0'
  },
  verification: {
    checkpointValidated: true,
    attemptSequenceValidated: true,
    attemptOwnershipValidated: true,
    contentReferencesMatched: true,
    contentIntegrityVerified: false,
    atomicSnapshotGuaranteed: false,
    runtimeContinuityVerified: false
  },
  warnings: [
    'NON_ATOMIC_CROSS_STORE_READ',
    'RUNTIME_CONTINUITY_NOT_VERIFIED'
  ],
  executable: false
}
```

All returned nested objects and arrays must be detached. `warnings` is a stable array of codes, not arbitrary diagnostic text. The result is a **candidate**, not an executable StudySession. Success MUST NOT claim durable storage, actual content-byte integrity, or behavioral equivalence.

### 7.2 Failure: throw a typed error

`planHydration` MUST throw an `Error`-compatible object with:

```js
{
  name: 'HydrationError',
  code: 'HYDRATION_CHECKPOINT_NOT_FOUND',
  message: 'Checkpoint not found for requested session.',
  details: { /* JSON-safe, non-sensitive, no attempt answers */ }
}
```

Stable codes:

- `HYDRATION_INVALID_REQUEST`
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
- `HYDRATION_PLAN_INVALID`

Do not return a partial success object after failure. Do not leak full attempts, answers, raw content, or caller secrets in error messages/details. Existing store/codec exceptions may be retained as internal `cause`, but public `code` MUST be one of the above.

## 8. Runtime continuity limitation — H-DEC-04 / H-DEC-05

**H-DEC-04:** Accept only the explicit compatibility matrix in §4.1.

**H-DEC-05:** CheckpointCodec deliberately omits `lastFlowResult` and `lessonRuntime.plan`. StudySession V0.2.0 reads `lastFlowResult?.adaptiveDecision?.action` as `previousAction` for LearningFlow and uses the LessonPlan for delivery navigation. Therefore, validated checkpoint data do **not** prove identical next-turn behavior.

Hydration MUST NOT:

- call `createStudySession()` and treat the newly initialized object as restored;
- set omitted fields to arbitrary values and claim equivalent behavior;
- rebuild a lesson plan or infer `previousAction` without a separately approved rule;
- call the StudySession public APIs to test execution during planning.

Phase 3.3-C MUST explicitly resolve (a) trusted dependency wiring, (b) `lastFlowResult`/`previousAction` continuity, (c) lesson-plan regeneration and decision binding, (d) active question/selection restoration, (e) student-state and mastery evidence continuity, and (f) a versioned restoration seam. Until then, `executable` remains `false`.

## 9. Safety invariants

1. **Fail closed:** reject partial, inconsistent, unsupported, or mismatched observations.
2. **No replay:** persisted attempts are evidence, not commands.
3. **No duplicate mastery:** never rerun LearningFlow or mastery updates during hydration.
4. **No fabricated dependencies:** load banks, rules and engines only from trusted application wiring in a future restoration phase.
5. **No silent migration:** migration is separately versioned and tested.
6. **No mutation:** inputs, store contents and returned candidate are isolated.
7. **No executable promise:** `ready-for-restoration` means validated candidate only.
8. **No durability claim:** in-memory storage and two-pass reads are not transactional persistence.
9. **No implicit recovery:** do not delete or ignore orphan attempts.
10. **No content-integrity claim:** matching reference hashes are not proof that content bytes were rehashed.

## 10. Required test matrix

| ID | Test / expected result |
|---|---|
| HYC-01 | Real K283 persisted session yields detached `ready-for-restoration`, `executable:false` |
| HYC-02 | Missing checkpoint → `HYDRATION_CHECKPOINT_NOT_FOUND` |
| HYC-03 | Session identity mismatch → `HYDRATION_SESSION_MISMATCH` |
| HYC-04 | Invalid codec checkpoint → `HYDRATION_INVALID_CHECKPOINT` |
| HYC-05 | Revision/checkpoint changes during read → `HYDRATION_REVISION_MISMATCH` |
| HYC-06 | Missing attempt ID/payload → sequence/payload mismatch as applicable |
| HYC-07 | Extra or reordered attempt → `HYDRATION_ATTEMPT_SEQUENCE_MISMATCH` |
| HYC-08 | Conflicting attempt payload ID/session → `HYDRATION_ATTEMPT_PAYLOAD_MISMATCH` |
| HYC-09 | Content version/hash mismatch → `HYDRATION_CONTENT_MISMATCH` |
| HYC-10 | Unsupported checkpoint/runtime/student-state version → `HYDRATION_UNSUPPORTED_VERSION` (unless codec itself rejects first) |
| HYC-11 | No StudySession/engine calls or mutation during planning |
| HYC-12 | Mutating result does not change either store or caller refs |
| HYC-13 | Empty checkpoint attempt IDs and empty store IDs succeed |
| HYC-14 | Orphan extra attempt rejects; no cleanup or replay |
| HYC-15 | Revision changes between passes reject |
| HYC-16 | Payload `attemptId` differs from requested ID rejects |
| HYC-17 | Payload `sessionId` differs from requested session rejects |
| HYC-18 | Expected content refs have missing/extra keys → mismatch |
| HYC-19 | Content ID/version/hash mismatch rejects; SHA hex case-only difference accepted |
| HYC-20 | Unsupported runtime name/version rejects |
| HYC-21 | Store read throws → `HYDRATION_READ_FAILED` |
| HYC-22 | Result mutation does not affect caller inputs or subsequent reads |
| HYC-23 | Missing/malformed request or store method → `HYDRATION_INVALID_REQUEST` |
| HYC-24 | Incomplete lesson progress/mastery state → `HYDRATION_INCOMPLETE_STATE` or codec error according to gate precedence |
| HYC-25 | Changed checkpoint body with unchanged revision is detected on second pass |
| HYC-26 | Success flags remain `contentIntegrityVerified:false`, `atomicSnapshotGuaranteed:false`, `runtimeContinuityVerified:false` |
| HYC-27 | No returned partial plan after any rejection; typed error details do not leak answer payloads |

Use deterministic in-memory fixtures and a real K283 integration fixture. Test injected store mutations/exceptions without modifying locked stores. A test is **not PASS** until it is actually run and reported.

## 11. Phase gates and acceptance

### 3.3-A — Contract freeze

- [x] Verify checkpoint property and public store/codec APIs.
- [x] Verify StudySession runtime and Student State versions from source.
- [x] Define proposed strict orphan policy, compatibility, errors, outputs and limitations.
- [ ] Review and approve this complete contract.
- [ ] Mark contract **LOCKED** only after explicit approval.

### 3.3-B — Read-only hydration

Implement only the four new hydration modules and their tests. Require HYC-01–HYC-27 PASS (or document any formally approved test revisions), no modifications to LOCKED files, no executable resume.

### 3.3-C — Resume design (separate approval)

Design and version a restoration seam and runtime-continuity policy; test with real K283 end-to-end session behavior. Do not silently patch StudySession V0.2.0.

### 3.3-D — Persistence backend evolution (future)

Durable storage, transactional reads/writes, orphan recovery, crash consistency and multi-process semantics are separate work.

## 12. Decision register

| ID | Decision | Status |
|---|---|---|
| H-DEC-01 | Strict ordered equality of checkpoint/store attempt IDs; orphan rejects | Proposed for approval |
| H-DEC-02 | Two-pass revision/checkpoint/ID observation; explicitly non-atomic | Proposed for approval |
| H-DEC-03 | Exact content-ref keys, IDs, versions, digest values; no byte-integrity claim | Proposed for approval |
| H-DEC-04 | Explicit checkpoint/runtime/student-state version allowlist | Proposed for approval |
| H-DEC-05 | No behavioral-continuity claim; restoration seam deferred | Proposed for approval |

**Final boundary:** Phase 3.3-B may produce a validated detached candidate, never a runnable StudySession. This document remains **NOT LOCKED** until reviewed and explicitly approved.
