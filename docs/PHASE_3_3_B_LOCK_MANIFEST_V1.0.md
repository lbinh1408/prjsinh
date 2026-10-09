# Phase 3.3-B — Hydration Planning V1
## LOCK Manifest V1.0

**Date:** 2026-10-09  
**Baseline commit (user-supplied):** `311c30acfb8d4b199e9bdb0942878cf6651ad835`  
**Decision:** **SCOPED LOCK — implementation baseline accepted on user-reported evidence**. Repository contents and tests have not been independently verified at this commit. This is a project-level design freeze, not an assertion of independently audited production readiness.

## 1. Frozen scope
- Hydration Contract V1; Hydration Reader V1 (external store error sanitization); Hydration Validator V1; Hydration Planner V1.
- `planHydration(request)` reads persisted state, validates compatibility, and creates a detached, **non-executable** restoration candidate.
- Planning is synchronous and read-only; it must not create a StudySession, replay attempts, execute engines, mutate stores, or restore runtime continuity.
- Previously LOCKED StudySession V0.2.0, Persistence V1, Mastery Engine V2, and Knowledge Map V4 are not modified by this decision.

## 2. Evidence register
- User reported **93/93 PASS** after correction of a test-only Proxy invariant error.
- User reported **5/5 PASS** for Final Gap Closure after aligning HYC-10 expected error code with actual implementation.
- User subsequently reported **all tests PASS** (expected combined total **98/98**). These are user-reported results; no CI run, command transcript for the full 98, or repository checkout at the supplied commit was independently inspected here.
- The additional tests exercise: HYC-04 malformed checkpoint; HYC-07 reordered attempt IDs; HYC-10 unsupported checkpoint schema; HYC-24 incomplete lesson progress; HYC-27 rejection without candidate or leaked adapter data.
- HYC-11/14 write-call spy passes after replacing a JavaScript Proxy with forwarding wrappers. An independent engine-call spy was not evidenced; the no-engine-call guarantee is based on architecture/source review, not an exhaustive instrumentation proof.

## 3. Accepted Contract Alignment V1.1 — normative clarification
1. **Error precedence:** unsupported `checkpoint.schemaVersion` yields `HYDRATION_UNSUPPORTED_VERSION`; malformed checkpoint structure or missing mandatory codec fields yields `HYDRATION_INVALID_CHECKPOINT`. This supersedes the earlier *proposed* codec-first precedence. Both branches are explicitly tested.
2. Attempt ID must match the persisted ID. A payload `sessionId` may be absent only when the locked session-scoped AttemptStore V1 guarantees ownership; if present, it must match.
3. External store exceptions must be normalized to `HYDRATION_READ_FAILED` without copying untrusted `error.message` or `error.code` into public details.
4. The two-pass read detects certain concurrent changes but **does not provide cross-store atomicity** or detect all same-ID payload races.
5. Content references are compared as identifiers, versions and declared hashes; the planner **does not recompute SHA-256 from content bytes**.
6. K283 persisted fixture is accepted as **schema-compatible fixture coverage**, not proof of direct capture from a live StudySession. Its placeholder content hashes do not establish content integrity.
7. Double request validation is defensive; callers and adapters must obey the documented synchronous interface.

## 4. LOCK boundary / explicit non-guarantees
- No executable restoration, runtime continuity, replay, cleanup, or engine execution in Phase 3.3-B.
- No atomic snapshot across CheckpointStore and AttemptStore.
- No byte-level content hash verification.
- No guarantee of detecting same-ID payload replacement between reads on arbitrary adapters.
- No claim that the K283 fixture was produced directly by a live runtime.

## 5. Change control
- Treat the four Hydration modules at the baseline commit as **frozen**. Any behavioral modification requires a documented change request, relevant regression tests, and a new manifest revision.
- Changes to already-LOCKED upstream modules require their own change-control process.
- Phase 3.3-C (Session Restoration) must consume the validated, non-executable candidate without silently assuming stronger guarantees than listed here.

## 6. Reproducibility / sign-off note
Before treating this as a **verified immutable release**, independently confirm that `git rev-parse HEAD` equals the baseline SHA, that the working tree is clean, and that the complete 98-test suite passes on that exact checkout. The user supplied a commit SHA after reporting all tests passed, but an independently verified post-commit run has not been provided. If those checks fail, this scoped LOCK must be reopened.

**Status: SCOPED LOCK V1.0 recorded; independent release verification outstanding.**
