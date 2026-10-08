# Phase 3.1 — Runtime Session Contract Audit

Status: AUDITED — persistence contract proposal, not yet LOCKED.

## Verified source facts

- `createStudySession()` constructs a fresh in-memory session. It initializes `attempts: []`, `lessonRuntime.progress` with empty completed/skipped arrays, and `masteryRuntime.evidenceHistoryByNode: {}`.
- Session `dependencies` embeds clones of question banks, lesson, knowledge map, mastery rules, evidence model, adaptive rules/paths, failure signatures and remediation rules.
- `getSessionSnapshot()` clones the entire session; it is NOT a minimal persistence checkpoint.
- `submitAnswer()` updates node-scoped runtime evidence from `flowResult.runtime.masteryEvidenceHistory`, commits Student State, replaces AdaptiveDecision, completes the active question_set section, invalidates the LessonPlan and clears current question/selection.
- Mastery evidence-history schema currently describes `{schemaVersion, byDimension}`, whereas StudySession stores `evidenceHistoryByNode[nodeId]` as dimension arrays. Serialization requires an explicit mapping/validation decision.
- StudySession does not expose a dedicated resume/hydration API in the audited file.

## Proposed storage boundaries

1. Student State store: canonical Student State V1.2.0 snapshot only. Never add raw Mastery observations to this schema.
2. Attempt store: canonical immutable Attempt records keyed by `attemptId`; reject duplicate conflicting writes.
3. Session checkpoint: session identity/config, current AdaptiveDecision, lesson section progress, active question identity/selection if safely restorable, remediation reference/plan if necessary, node-scoped mastery runtime evidence, and checkpoint revision.
4. Event store: optional for first MVP unless a producer and recovery semantics are defined; do not claim events can reconstruct state until replay equivalence is tested.
5. Content/policy registry: references to versioned lessons, question banks, knowledge map, rules and signatures. Do not embed complete dependencies into checkpoint.

## Proposed checkpoint fields (not final JSON Schema)

- `schemaVersion`, `checkpointId`, `revision`, `savedAt`
- `sessionId`, `studentId`, `runtimeVersion`, `status`, `startedAt`, `lastActivityAt`
- `config` (learningMode, timeBudget, clusterId, lessonId, contextId, historyLimit)
- `contentRefs` (lesson ID/version, bank IDs/versions, knowledge/policy/evidence model versions or hashes)
- `studentStateRef` (snapshot ID/revision)
- `currentDecision` (canonical decision)
- `lessonProgress` (completedSectionIds, skippedSectionIds)
- `masteryEvidenceHistoryByNode` (runtime-only evidence observations)
- `activeItem` (kind/section ID/question ID, only if exact rehydration can be proven)
- `attemptCursor` / references, not full historical duplicate

Do not persist `lessonRuntime.plan` or `lastFlowResult` by default; plan is a projection, and lastFlowResult is derivable/debug material unless proven necessary. Do not blindly replay an already committed attempt.

## Unresolved decisions / gates

- Define exact serialization mapping and validation for evidence history; existing evidence-history schema shape is not the StudySession container shape.
- Define restore semantics for active selected question and elapsed time.
- Define how runtime `history` and bounded `historyLimit` are restored without changing QuestionSelector exclusions.
- Define content-version mismatch handling: fail closed or explicit migration, never silently resume against different bank/policies.
- Define atomic commit across Attempt, Student State and checkpoint; use idempotent attempt IDs and checkpoint revision CAS.
- Confirm Event producer/contract before introducing event-sourced recovery.
- Add explicit hydration API outside LOCKED StudySession if possible; prove state parity before any engine changes.

## Acceptance tests required

1. Save/resume before any question selection.
2. Save/resume after content section completion; no redelivery.
3. Save/resume after Q010 correct; no duplicate Attempt or evidence.
4. Same evidence history before/after resume, including semantic context ID and question type.
5. Same next AdaptiveDecision and QuestionSelector result for fixed clock/content.
6. Reject incompatible content version/hash.
7. Reject stale checkpoint revision; reject conflicting duplicate attemptId.
8. Crash between writing Attempt and checkpoint must recover consistently.
9. Caller-owned inputs unchanged; checkpoint serialization deterministic.
10. Student State validates against V1.2.0 and does not contain raw runtime evidence.

## Implementation order

A. Lock the checkpoint contract after resolving the gates above.
B. Implement pure `serializeStudySessionCheckpoint` and `validateStudySessionCheckpoint` outside StudySession.
C. Implement hydration and equivalence tests using real K283 Q010.
D. Implement atomic local persistence and crash/idempotency tests.
E. Only then add learning API and UI.

No production code was changed by this audit.
