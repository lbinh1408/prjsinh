# Phase 3.3-B — Final Contract Traceability & LOCK Review

Status: REVIEW CANDIDATE — NOT LOCKED. Date: 2026-10-09.

## Evidence
- User-reported: 61 unit, 13 integration, 9 final regression tests PASS (83 total). These were not independently rerun against the user's current repository in this review.
- Reviewed: original `PHASE_3_3_HYDRATION_CONTRACT_V1.md`, `docs/CONTRACT_ALIGNMENT_V1.md`, `hydrationReader.js`, `hydrationPlanner.js`, and 9 named regression tests.
- K283 fixture includes checkpoint revision 1, runtime StudySession 0.2.0, one attempt; fixture provenance from live engine is not established. Content hashes are all-zero placeholders.
- 'Covered' means a corresponding reported passing test is identified; it does not prove every branch of a composite requirement.

## HYC traceability matrix
| ID | Identified evidence | Assessment / outstanding work |
|---|---|---|
| 01 | FinalRegression HYC-01 | PARTIAL: fixture-based, live StudySession capture provenance not established |
| 02 | Acceptance HYA-03 | COVERED: missing checkpoint |
| 03 | FinalRegression HYC-03 | COVERED: session mismatch |
| 04 | Validator unit suite (reported); no individually named test available here | VERIFY: explicit malformed-codec checkpoint test and precedence |
| 05 | Acceptance HYA-07, HYA-09 | COVERED: revision and checkpoint-body race |
| 06 | Acceptance HYA-04; Reader source | PARTIAL: explicit listed-but-missing payload case needs trace |
| 07 | Acceptance HYA-04, HYA-08 | PARTIAL: extra and race IDs; explicit reorder case needs trace |
| 08 | Planner HYP-11; FinalRegression HYC-17 | COVERED: wrong ID and wrong session |
| 09 | Planner HYP-10 | PARTIAL: version mismatch; hash mismatch test needs trace |
| 10 | Planner HYP-12; FinalRegression HYC-20 | PARTIAL: unsupported runtime; student state and codec-version branches need trace |
| 11 | Reader/Planner source review | PARTIAL: no-engine-call assertion and mutation spy not independently tested |
| 12 | Planner HYP-13; Acceptance HYA-06 | COVERED: result detached |
| 13 | Planner HYP-06; Acceptance HYA-02 | COVERED: empty attempts |
| 14 | Planner HYP-09; Acceptance HYA-04 | PARTIAL: orphan rejection covered; explicit no-cleanup/replay spy needed |
| 15 | Acceptance HYA-07 | COVERED: revision changes |
| 16 | Planner HYP-11 | COVERED: attempt ID mismatch |
| 17 | FinalRegression HYC-17 | COVERED: attempt session mismatch |
| 18 | FinalRegression HYC-18 | PARTIAL: extra key covered; missing key test needs trace |
| 19 | FinalRegression HYC-19; Planner HYP-10 | PARTIAL: SHA case and version covered; hash and ID mismatch need trace |
| 20 | FinalRegression HYC-20; Planner HYP-12 | COVERED: runtime name and version |
| 21 | Planner HYP-15; Acceptance HYA-10 | COVERED: store read exception |
| 22 | Planner HYP-13/HYP-14; Acceptance HYA-06 | COVERED: immutability/detachment |
| 23 | Planner HYP-07; Contract unit suite | PARTIAL: malformed store-method test needs named trace |
| 24 | FinalRegression HYC-24 | PARTIAL: mastery branch covered; lesson-progress branch needs trace |
| 25 | Acceptance HYA-09 | COVERED: body change without revision change |
| 26 | Planner HYP-04/HYP-05; Acceptance HYA-11 | COVERED: conservative flags |
| 27 | Planner HYP-16; FinalRegression HYC-27 | PARTIAL: no-leak in selected paths; all error paths and partial-plan absence need verification |

## Contract alignment decisions proposed for approval
1. G07: attempt ID must match; optional payload sessionId must match when present. Missing payload sessionId is accepted only when backed by the session-scoped ownership invariant of locked AttemptStore V1.
2. Error precedence: malformed codec checkpoint -> INVALID_CHECKPOINT, including unsupported checkpoint schema rejected by codec. Runtime/state unsupported versions -> UNSUPPORTED_VERSION after structural validation.
3. Two-pass consistency is observational only; no atomic snapshot or payload mutation guarantee for arbitrary adapters. Restrict approved adapter to locked append-only in-memory AttemptStore V1.
4. K283 fixture demonstrates schema-compatible persisted data, not proven direct live-engine capture. All-zero hashes do not establish actual content integrity.
5. Error sanitization: Reader currently copies unexpected `error.code` to `details.causeCode`; potentially sensitive arbitrary code must be sanitized or explicitly accepted with an adversarial test.
6. Duplicate request validation (Planner + Reader) should be documented as defense in depth; caller input must be treated as stable during a synchronous call.

## Lock blockers
- Resolve/document incomplete HYC branch coverage above, ideally with named acceptance tests.
- Approve the proposed contract amendment and record its exact version.
- Test or sanitize arbitrary thrown store `error.code` (possible leakage in error details).
- Resolve the provenance requirement for HYC-01: supply live engine capture evidence or formally approve fixture-based scope.
- Run complete suite after any code/contract amendment and record final results.

No LOCK recommendation at this time. Do not modify locked Persistence/StudySession/Mastery modules.
