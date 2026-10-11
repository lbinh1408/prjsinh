# Phase 3.3-C — Question/Attempt Restoration Contract V1 (DRAFT)

Status: **DRAFT / REVIEW REQUIRED**. Contract proposal only; no production changes, no execution permit. Parent Phase 3.3-C remains DRAFT. Pending Content Restoration V1.1 remains LOCKED and unchanged.

## 1. Scope and boundaries

This contract proposes guarded reconstruction of an in-progress `question_set` delivery from an authenticated, revision-fenced, durable capture. It does **not** authorize calling `submitAnswer`, re-running QuestionSelector, creating an Attempt, updating mastery, or automatically resuming execution. `executable` MUST be `false` at every boundary.

Evidence from available StudySession source: question delivery returns `status: 'QUESTION'` with `item`, `selection`, `question`, `session`; `completeLessonItem` explicitly rejects `question_set`, requiring `submitAnswer`. AttemptStore enforces attemptId idempotency (same payload no-op; different payload conflict). These facts do not establish a durable draft-answer model.

## 2. State classification (fail closed)

| State | V1 policy | Rationale |
|---|---|---|
| Pending `question_set` + selected question, no submission begun | Candidate for guarded capture only, after consistency checks | Delivery identity must not be regenerated |
| Pending question with locally entered but unsubmitted answer | Unsupported until a canonical draft-answer contract is identified | UI-only drafts cannot be inferred from checkpoint |
| Submission in flight / uncertain persistence outcome | Reject restoration of executable flow | Prevent duplicate Attempt / mastery updates |
| Submitted Attempt already durably recorded | Historical read-only continuity only; never replay | AttemptStore idempotency alone does not prove end-to-end exactly-once |
| Missing/mismatched question, selection, plan, revision or provenance | Reject | Fail closed |

## 3. Proposed capture preconditions

1. StudySession runtime active; session ID and revision valid and bound to the authenticated capture authority.
2. `lessonRuntime.currentItem.kind === 'question_set'` and the item is the next valid unresolved item in the canonical lesson plan/progress. Do not reuse content-only validator unchanged.
3. `currentQuestion` and `currentSelection` exist, are structurally valid, and refer to the same delivered question. Exact linkage fields must be established from the real QuestionSelector and StudySession contracts before implementation.
4. Bind the *actual selected* question and selection metadata, question bank/dependency digests, plan/progress, and pending item to the captured revision. Never reselect on restore.
5. Confirm no ambiguous submit-in-flight marker and no conflicting persisted Attempt for the same delivery; absence-of-attempt must be checked against an authoritative durable store, not an in-memory guess.
6. Capture must preserve existing authenticated durable, live revision fence, and pre-auth read boundaries. Hash-only integrity is not sufficient authentication.

## 4. Proposed read/reconstruction invariants

- Authenticate and verify checkpoint binding, durable revision, dependency coverage, and manifest **before** interpreting untrusted question/selection payloads.
- Reject stale or torn captures, inconsistent question IDs, divergent plan/progress, changed question-bank fingerprints, and any ambiguous submit state.
- Reconstruct an immutable *guarded candidate* for inspection/comparison only: `executable:false`, `autoSubmit:false`, `selectionRerun:false`, `masteryMutation:false`.
- Never call `submitAnswer`, `completeLessonItem`, AttemptBuilder, AttemptStore append, or LearningFlow as a side effect of read.
- Restoration must not weaken Pending Content V1.1 validation or alter LOCKED engines.

## 5. Draft error taxonomy (not yet normative)

`QUESTION_PENDING_INVALID_STATE`, `QUESTION_SELECTION_MISMATCH`, `QUESTION_NAVIGATION_MISMATCH`, `QUESTION_DEPENDENCY_DRIFT`, `QUESTION_SUBMISSION_AMBIGUOUS`, `QUESTION_ATTEMPT_CONFLICT`, `QUESTION_REVISION_STALE`, `QUESTION_UNSUPPORTED_DRAFT`, `QUESTION_AUTHENTICATION_FAILED`.

Implementations should reuse established shared errors when semantically identical; finalize names only after mapping existing validator contracts.

## 6. Acceptance criteria before any LOCK

- Unit tests: valid guarded pending question, missing/mismatched selection, plan jump/replay, already resolved item, absent/changed question bank, malformed payload, ambiguous submit, duplicate/conflicting attempt, stale revision.
- Security tests: tampering even with recomputed unkeyed SHA-256, forged provenance, auth-before-read, crash/torn durable state, concurrent capture revision races.
- Real integration: actual StudySession question delivery and actual QuestionSelector result, durable authenticated capture/read, guarded reconstruction, deep state equivalence, and no side effects. Do **not** use fake question-selection fixtures as proof of real runtime integration.
- Explicit negative tests: no `submitAnswer` or mastery update during reconstruction; no attempt replay; no execution permit.
- Full Restoration regression plus locked-engine regression PASS, recorded against exact Git commit SHA.

## 7. Open decisions / evidence needed

1. Exact shape of `currentSelection`, `currentQuestion`, `lessonRuntime.currentItem` from real `getNextStudyItem`.
2. Exact `submitAnswer` transaction boundary and its interactions with AttemptBuilder, AttemptStore, LearningFlow, and checkpoint persistence.
3. Whether a canonical durable draft-answer or submission-in-flight state exists; otherwise V1 excludes drafts and in-flight submissions.
4. Stable question identity and fingerprint rules across question bank versions.
5. Which checkpoint/extension version change is required so content-only V1.1 remains unaffected.

## 8. Change control

Do not modify the LOCKED StudySession, Mastery, Persistence, Hydration, or Pending Content V1.1 contracts. New question support must be separately versioned and explicitly gated. No global atomicity or exactly-once guarantee is claimed.
