# AI PROJECT CONTEXT — ADAPTIVE BIOLOGY LEARNING SYSTEM

**Project:** Adaptive Biology Learning System  
**Document version:** 1.0.0  
**Last updated:** 2026-10-08  
**Current phase:** Phase 3.3-A — Hydration Contract Verification  
**Previous phase:** Phase 3.2 — Persistence V1 LOCKED  
**Primary language:** Vietnamese  
**Technology:** JavaScript ES Modules, Node.js, JSON, JSON Schema

---

## 1. PURPOSE OF THIS DOCUMENT

This document is the authoritative handover context for AI assistants working on this repository.

It is intended for:

- ChatGPT conversations.
- Codex in VS Code.
- Antigravity IDE.
- Other AI coding assistants.

An AI assistant must read this document before making architectural decisions or modifying project files.

This document provides project context and known decisions. It does not override actual source code, automated tests, or explicitly approved contracts.

If this document conflicts with current repository files, the AI must report the discrepancy and request clarification before changing locked behavior.

## 2. PROJECT OBJECTIVE

Build an Adaptive Biology Learning System for Vietnamese high-school students following CTGDPT 2018.

The system should support:

- Structured Biology knowledge maps.
- Lessons and practice questions.
- Diagnostic and practice modes.
- Adaptive question selection.
- Evidence-based mastery tracking.
- Remediation for knowledge gaps.
- StudySession orchestration.
- Safe persistence of learning progress.
- Future hydration and session resume.

The long-term goal is to help students independently prepare for the Vietnamese high-school graduation Biology examination, including advanced questions targeting a score of 10/10.

The system is developed using a contract-first approach.

### Engineering principles

1. Contract before implementation.
2. JSON Schema validation where applicable.
3. Unit tests before integration tests.
4. Real learning-flow integration tests.
5. Explicit versioning and LOCK decisions.
6. No silent breaking changes.
7. No modification of LOCKED modules without approval.
8. No fabricated test results.
9. Prefer deterministic, independently testable components.
10. Keep persistence, hydration, and runtime execution as separate responsibilities.

## 3. CORE ARCHITECTURE

The overall architecture is:

```text
Knowledge Map V4
       |
       v
Knowledge Engine
       |
       +----------------------+
       |                      |
       v                      v
Lesson Engine           Question Engine
       |                      |
       +-----------+----------+
                   |
                   v
              StudySession
                   |
                   v
              LearningFlow
                   |
                   v
              Mastery Engine V2
                   |
                   v
               Student State

StudySession
       |
       v
Persistence Coordinator V1
       |
       +--> AttemptStore V1
       |
       +--> CheckpointCodec V1
       |
       +--> CheckpointStore V1

CheckpointStore + AttemptStore
       |
       v
Phase 3.3 Hydration Layer
       |
       v
Validated Restoration Plan
       |
       v
Future StudySession Resume
```

This diagram represents conceptual responsibilities. The AI must verify actual module dependencies and exports in the repository before coding.

## 4. LOCKED COMPONENTS

### 4.1 Knowledge Map V4

**Status: LOCKED**

The project uses `knowledge-map-v4.json`.

Do not create Knowledge Map V5 or modify established node dependencies without explicit approval.

Previously approved dependency corrections include:

- K014: removed D3 dependency K041.
- K034: removed D3 dependency K070.
- K072: removed D2 dependency K074.

Knowledge dependencies must remain a valid DAG.

### 4.2 StudySession V0.2.0

**Status: LOCKED**

StudySession orchestrates the learning session.

Known public API:

```javascript
createStudySession()
getNextStudyItem()
completeLessonItem()
getNextQuestion()
submitAnswer()
getSessionSnapshot()
getStudentState()
```

The actual function signatures must be verified from the repository.

StudySession currently does not expose an approved hydration or resume interface.

Do not modify StudySession to support Phase 3.3 without a separate approved, versioned restoration contract.

### 4.3 Mastery Engine V2

**Status: LOCKED**

Do not modify mastery rules, evidence processing, mastery updates, or mastery engine behavior to implement hydration.

Hydration must not replay attempts through Mastery Engine.

Hydration must not recalculate mastery unless a separate reconciliation contract is approved.

### 4.4 Persistence V1

**Status: LOCKED after Phase 3.2 regression**

Locked modules:

```text
src/persistence/
├── checkpointCodec.js
├── attemptStore.js
├── checkpointStore.js
└── persistenceCoordinator.js
```

Do not modify these modules for Phase 3.3 unless the user explicitly approves a versioned contract change.

The source files may still contain historical `DRAFT` metadata or comments. These must not be silently changed or interpreted as permission to alter the locked implementation.

## 5. PHASE 3.2 — PERSISTENCE V1

### 5.1 Verification results

The project owner reported the following successful tests on 2026-10-08:

| Suite | Result |
|---|---:|
| CheckpointCodec unit | 30/30 PASS |
| AttemptStore unit | 40/40 PASS |
| CheckpointStore unit | 50/50 PASS |
| PersistenceCoordinator unit | 55/55 PASS |
| K283 integration suite | 75/75 PASS |
| Final Consistency Audit | 10/10 PASS |
| **Total** | **260/260 PASS** |

These are reported results, not a substitute for rerunning tests after future changes.

### 5.2 Persistence write order

```text
1. Validate persistence request
2. Preflight checkpoint revision
3. Verify stored attempt prefix
4. Validate existing attempt payloads
5. Append missing attempts
6. Verify complete attempt sequence
7. Encode checkpoint
8. Save checkpoint using CAS
9. Return committed or idempotent result
```

**Critical invariant: attempts must be stored before the checkpoint references them.**

### 5.3 Persistence limitations

Persistence V1 is:

- In-memory.
- Not durable across process restarts.
- Not transactional across both stores.
- Not atomic across AttemptStore and CheckpointStore.
- Not guaranteed safe across multiple processes.
- Not capable of hydrating a runnable StudySession.
- Not capable of resuming a StudySession.

Do not claim these capabilities exist.

### 5.4 Final Consistency Audit

The following tests passed:

| Test | Purpose |
|---|---|
| FCA-01 | Attempt write-then-throw recovery |
| FCA-02 | Checkpoint write-then-throw recovery |
| FCA-03 | Conflicting attempt payload rejection |
| FCA-04 | Non-prefix attempt sequence rejection |
| FCA-05 | Stale CAS protection |
| FCA-06 | Competing writer conflict |
| FCA-07 | Attempts-first integrity |
| FCA-08 | Retry after checkpoint failure |
| FCA-09 | Detached data and immutability |
| FCA-10 | Capability metadata honesty |

The competing-writer test simulates sequential in-process contention; it is not a distributed concurrency test.

### 5.5 Error semantics

Important distinction:

```text
Coordinator preflight revision conflict:
    PERSISTENCE_REVISION_CONFLICT

CheckpointStore CAS conflict during write:
    PERSISTENCE_WRITE_FAILED
        cause.code = CHECKPOINT_REVISION_CONFLICT
```

Do not change these error semantics merely to satisfy a new test.

## 6. VERIFIED PERSISTENCE CONTRACT DETAILS

The following details were verified against supplied source files.

### 6.1 CheckpointCodec V1

File:

`src/persistence/checkpointCodec.js`

Public exports:

```javascript
CHECKPOINT_CODEC_INFO
validateCheckpoint()
encodeCheckpoint()
decodeCheckpoint()
getCheckpointCodecInfo()
```

Checkpoint schema version:

`1.0.0-draft`

Checkpoint structure:

```javascript
{
    schemaVersion,
    revision,
    savedAt,
    runtime,
    config,
    contentRefs,
    state,
    currentDecision,
    currentSelection,
    currentQuestion,
    lessonRuntime,
    activeRemediationPlan,
    history,
    masteryRuntime,
    attemptIds
}
```

**Important:** The checkpoint stores `attemptIds`, not `persistedAttemptIds`.

`persistedAttemptIds` is an input parameter of `encodeCheckpoint()`.

Checkpoint excludes:

```text
dependencies
attempts
lastFlowResult
lessonRuntime.plan
```

The codec validates and returns detached JSON-safe data.

`decodeCheckpoint()` does not reconstruct an executable StudySession.

### 6.2 Content references

The codec requires a nonempty object of versioned content references.

Each reference has:

```javascript
{
    id: '...',
    version: '...',
    sha256: '64-character-hex-string'
}
```

Phase 3.3 must define how trusted current references are obtained and compared.

Do not fabricate SHA-256 hashes.

### 6.3 AttemptStore V1

File:

`src/persistence/attemptStore.js`

Public factory:

```javascript
createAttemptStore()
```

Public operations:

```javascript
appendAttempt({ sessionId, attempt })
getAttempt({ sessionId, attemptId })
listAttempts({ sessionId })
listAttemptIds({ sessionId })
hasAttempt({ sessionId, attemptId })
countAttempts({ sessionId })
getInfo()
```

Behavior:

- Attempts are ordered by insertion.
- `getAttempt()` returns `null` if missing.
- An exact retry is idempotent.
- A conflicting attempt payload is rejected.
- Attempt IDs have global session ownership.
- Returned attempt records are detached copies.
- An attempt record may omit its own `sessionId`; store ownership is determined by the method's `sessionId` argument.

Do not require `attempt.sessionId` unconditionally in hydration validation.

### 6.4 CheckpointStore V1

File:

`src/persistence/checkpointStore.js`

Known public operations:

```javascript
saveCheckpoint()
getCheckpoint()
hasCheckpoint()
getRevision()
getInfo()
```

Known behavior from Phase 3.2:

- CAS revision enforcement.
- Idempotent identical retries.
- Session ownership checks.
- Detached returned checkpoint data.
- In-memory storage.

Before implementing hydration, inspect the actual file and verify:

- Exact argument shapes.
- Missing-checkpoint return value.
- Missing-session revision value.
- Revision conflict behavior.
- Return values and metadata.

Do not guess these details.

### 6.5 PersistenceCoordinator V1

File:

`src/persistence/persistenceCoordinator.js`

Public API:

```javascript
createPersistenceCoordinator({
    attemptStore,
    checkpointStore
})
```

Returned operations:

```javascript
persistSession()
getPersistedSnapshot()
getInfo()
```

`getPersistedSnapshot()` returns an inspection snapshot:

```javascript
{
    sessionId,
    revision,
    checkpoint,
    attemptIds
}
```

It is not a hydration API.

## 7. REAL K283 INTEGRATION CONTEXT

The project has real StudySession integration tests using Biology knowledge node K283.

Relevant question:

`Q-A-K283-T-010`

Example attempt ID:

`ATT-K283-Q010-001`

The existing test harness provides a real StudySession fixture and transfer-question flow.

Relevant parent test file:

`tests/integration/studySession.lesson.learningflow.integration.test.js`

Relevant persistence integration files:

```text
tests/integration/persistence/
├── attemptStore.realSession.integration.test.js
├── checkpointStore.realSession.integration.test.js
├── persistenceCoordinator.realSession.integration.test.js
└── persistenceCoordinator.finalConsistency.audit.test.js
```

Reuse existing K283 fixtures for new real-session integration tests.

Do not replace real-session integration coverage with synthetic fixtures alone.

## 8. CURRENT PHASE — 3.3-A

**Phase:** Hydration Contract Verification

**Status:** IN PROGRESS — NOT LOCKED

Objective:

Verify the exact persisted data contract before implementing hydration.

Hydration must safely read checkpoint and attempts, validate integrity, and produce a detached restoration plan.

It must not yet resume a StudySession.

### Proposed architecture

```text
CheckpointStore V1
        |
        +-------------------+
        |                   |
        v                   v
Hydration Reader       AttemptStore V1
        |                   |
        +---------+---------+
                  |
                  v
          Hydration Validator
                  |
                  v
          Hydration Planner
                  |
                  v
      Validated Restoration Plan
                  |
                  v
     Future StudySession Restorer
```

### Proposed modules

```text
src/hydration/
├── hydrationContract.js
├── hydrationReader.js
├── hydrationValidator.js
└── hydrationPlanner.js
```

These are proposed paths, not confirmation that the files already exist.

## 9. HYDRATION CONTRACT REQUIREMENTS

### 9.1 Input proposal

```javascript
planHydration({
    sessionId,
    expectedContentRefs,
    checkpointStore,
    attemptStore
});
```

The exact API is not yet LOCKED.

### 9.2 Required validation gates

1. Checkpoint existence.
2. Session identity.
3. Checkpoint schema validation.
4. Checkpoint revision consistency.
5. Exact attempt ID sequence.
6. Attempt payload identity and ownership.
7. Content reference compatibility.
8. Runtime and checkpoint version compatibility.
9. Required projected state completeness.
10. Detached output and immutability.

### 9.3 Proposed output

```javascript
{
    status: 'ready-for-restoration',
    sessionId,
    revision,
    checkpoint,
    attempts,
    contentRefs,
    runtimeVersion,
    warnings: [],
    executable: false
}
```

`executable: false` is mandatory until a separately approved StudySession restoration interface exists.

### 9.4 Hydration invariants

- Fail closed on invalid or inconsistent persisted data.
- Do not replay submitted attempts.
- Do not call Mastery Engine.
- Do not recompute mastery during hydration.
- Do not advance StudySession.
- Do not mutate AttemptStore or CheckpointStore.
- Do not silently migrate schemas.
- Do not restore dependencies from serialized checkpoint data.
- Do not promise durable resume with in-memory stores.
- Do not treat `ready-for-restoration` as an active session.

### 9.5 Proposed error codes

```text
HYDRATION_CHECKPOINT_NOT_FOUND
HYDRATION_SESSION_MISMATCH
HYDRATION_INVALID_CHECKPOINT
HYDRATION_REVISION_MISMATCH
HYDRATION_ATTEMPT_SEQUENCE_MISMATCH
HYDRATION_ATTEMPT_PAYLOAD_MISMATCH
HYDRATION_CONTENT_MISMATCH
HYDRATION_UNSUPPORTED_VERSION
HYDRATION_INCOMPLETE_STATE
HYDRATION_READ_FAILED
```

These codes are proposals and must be approved before implementation.

## 10. PHASE 3.3 TEST PLAN

Proposed initial tests:

| ID | Description |
|---|---|
| HYC-01 | Valid K283 persisted session |
| HYC-02 | Missing checkpoint |
| HYC-03 | Session identity mismatch |
| HYC-04 | Invalid checkpoint schema |
| HYC-05 | Revision mismatch |
| HYC-06 | Missing attempt |
| HYC-07 | Extra or reordered attempts |
| HYC-08 | Attempt payload mismatch |
| HYC-09 | Content reference mismatch |
| HYC-10 | Unsupported runtime version |
| HYC-11 | No engine or session mutation |
| HYC-12 | Detached restoration plan |

These tests have not yet been reported as implemented or passed.

## 11. IMMEDIATE NEXT TASK

**Task:** Complete Phase 3.3-A Hydration Contract Verification.

### Step 1 — Inspect actual repository

Read:

```text
docs/AI_PROJECT_CONTEXT.md
docs/contracts/PHASE_3_2_LOCK_REPORT.md
docs/contracts/PHASE_3_3_HYDRATION_CONTRACT_V1.md

src/persistence/checkpointCodec.js
src/persistence/attemptStore.js
src/persistence/checkpointStore.js
src/persistence/persistenceCoordinator.js
```

Also inspect StudySession public APIs and the K283 integration fixture as needed.

### Step 2 — Produce contract verification report

Create or propose:

`docs/contracts/PHASE_3_3_A_VERIFICATION_REPORT.md`

Include:

- Exact method signatures.
- Exact checkpoint schema.
- Missing-value semantics.
- Version compatibility requirements.
- Attempt sequence rules.
- Content reference comparison policy.
- Read consistency limitations.
- Open questions and implementation blockers.

### Step 3 — Request approval

Present the verification report and any proposed contract changes to the user.

Do not automatically implement hydration if contract decisions remain unresolved.

### Step 4 — Implement after approval

Only after Phase 3.3-A is approved:

1. Implement `hydrationContract.js`.
2. Implement `hydrationValidator.js`.
3. Implement `hydrationReader.js`.
4. Implement `hydrationPlanner.js`.
5. Add unit tests.
6. Add real K283 integration tests.
7. Run the full persistence regression suite.

## 12. AI WORKING RULES

When an AI assistant receives a task:

1. Read this document.
2. Identify the current phase.
3. Inspect relevant source files.
4. Identify LOCKED boundaries.
5. State the exact files it intends to change.
6. Do not modify unrelated files.
7. Preserve existing public APIs unless approved.
8. Write deterministic tests.
9. Report actual commands and actual results.
10. Distinguish verified facts from assumptions.
11. Stop and ask for approval when a LOCKED contract change is necessary.
12. Update this context document only when a phase transition or architectural decision is approved.

### Forbidden actions without approval

- Creating Knowledge Map V5.
- Changing locked knowledge dependencies.
- Editing StudySession V0.2.0.
- Editing Mastery Engine V2.
- Editing Persistence V1.
- Renaming existing persistence API fields.
- Introducing a new persistence backend as part of hydration.
- Implementing resume before its restoration contract is approved.
- Claiming tests passed without executing them.

## 13. STANDARD REGRESSION COMMAND

```bash
node --test \
  tests/unit/persistence/*.test.js \
  tests/integration/studySession.lesson.learningflow.integration.test.js \
  tests/integration/persistence/persistenceCoordinator.finalConsistency.audit.test.js
```

Expected baseline based on the project owner's last report:

**260/260 PASS**

A new AI assistant must rerun tests when it has repository access and must not present this historical baseline as a fresh test result.

## 14. HANDOVER INSTRUCTION FOR NEW AI SESSIONS

When continuing this project in a new ChatGPT conversation or IDE session, use the following instruction:

> Read `docs/AI_PROJECT_CONTEXT.md` and the relevant files under `docs/contracts/`.
>
> Continue the Adaptive Biology Learning System from Phase 3.3-A — Hydration Contract Verification.
>
> Phase 3.2 Persistence V1 is LOCKED after a reported 260/260 passing tests.
>
> Do not modify Knowledge Map V4, StudySession V0.2.0, Mastery Engine V2, or Persistence V1.
>
> Inspect the actual repository before proposing changes.
>
> First complete the Hydration Contract Verification Report. Do not implement resume yet.
>
> Explain any unresolved contract decisions in Vietnamese and wait for approval.

---

**END OF AI PROJECT CONTEXT v1.0.0**