# Phase 3.3-B — Hydration Planning V1: LOCK Manifest Candidate

Date: 2026-10-09
Decision: **HOLD — NOT LOCKED** (candidate for final sign-off)

## Scope
- Hydration Contract V1, Reader V1 (sanitized store errors), Validator V1, Planner V1.
- `planHydration(request)` is synchronous, read-only, and returns a detached non-executable restoration candidate.
- No StudySession construction, replay, engine execution, cross-store atomicity, or content-byte integrity guarantee.
- LOCKED Persistence V1, StudySession V0.2.0 and Mastery Engine V2 remain untouched.

## Evidence register
- User-reported PASS: Contract 11, Reader 14, Validator 20, Planner 16, integration 13, final regression 9, targeted acceptance 10. **93/93 total** after targeted test correction.
- The 10-test targeted suite initially had 9 PASS / 1 FAIL due to a Proxy invariant violation in the test wrapper; user replaced Proxy with forwarding wrapper and reported 10/10 and 93/93 PASS.
- K283 fixture: checkpoint revision 1, StudySession 0.2.0, one matching attempt. This is a schema-compatible fixture, **not proven live-engine capture**.
- Content refs in the fixture have all-zero SHA-256 placeholders; no actual content-byte integrity verification.
- This manifest is based on user-reported test results and inspected artifacts, not an independent rerun against the user's full local repository.

## Contract Alignment V1.1 — proposed acceptance
1. Attempt ID is required to match. Attempt payload `sessionId` may be absent only for the session-scoped, append-only, globally owned AttemptStore V1; if present it must match.
2. Codec-rejected checkpoint (including checkpoint schema version) maps to `HYDRATION_INVALID_CHECKPOINT`; unsupported runtime or student-state version after structural acceptance maps to `HYDRATION_UNSUPPORTED_VERSION`.
3. Two-pass reads are observational, not atomic; attempt payloads are not reread in the second pass. No arbitrary database adapter consistency guarantee.
4. Unexpected external store error messages and `error.code` must not be copied to public HydrationError details. Reader patch removes `causeCode`.
5. Double request validation is defense-in-depth, assuming stable synchronous caller inputs and adapter methods.
6. Fixture-based K283 compatibility is accepted only as fixture-based coverage; it does not prove live StudySession provenance.

## HYC traceability disposition (current evidence)
| HYC | Disposition | Evidence or open branch |
|---|---|---|
| 01 | CONDITIONAL | K283 fixture passes; direct engine-generated capture not established |
| 02 | TESTED | HYA-03 missing checkpoint |
| 03 | TESTED | FinalRegression HYC-03 |
| 04 | VERIFY | Named malformed-codec checkpoint test and precedence not independently identified |
| 05 | TESTED | HYA-07, HYA-09 |
| 06 | TESTED | Targeted HYC-06; HYA-04 |
| 07 | PARTIAL | Extra/late IDs tested; explicit reordered IDs branch not identified |
| 08 | TESTED | HYP-11; FinalRegression HYC-17 |
| 09 | TESTED | HYP-10; Targeted HYC-09 |
| 10 | PARTIAL | Runtime and student state tested; exact checkpoint schema branch and error precedence require explicit test |
| 11 | PARTIAL | Read-only source inspection and write-spy; no explicit engine-call spy |
| 12 | TESTED | HYP-13; HYA-06 |
| 13 | TESTED | HYP-06; HYA-02 |
| 14 | TESTED | HYA-04; targeted HYC-11/14 write-spy |
| 15 | TESTED | HYA-07 |
| 16 | TESTED | HYP-11 |
| 17 | TESTED | FinalRegression HYC-17 |
| 18 | TESTED | FinalRegression extra key; targeted missing key |
| 19 | TESTED | FinalRegression SHA case; targeted ID and SHA mismatch; HYP-10 version |
| 20 | TESTED | FinalRegression HYC-20; HYP-12 |
| 21 | TESTED | HYP-15; HYA-10 |
| 22 | TESTED | HYP-13/14; HYA-06 |
| 23 | TESTED | HYP-07; targeted HYC-23 |
| 24 | PARTIAL | Mastery branch tested; explicit lesson-progress incomplete branch not identified |
| 25 | TESTED | HYA-09 |
| 26 | TESTED | HYP-04/05; HYA-11; targeted HYC-26 |
| 27 | PARTIAL | Sensitive adapter error-code regression passes; exhaustive no-partial-plan/error-path coverage not established |

## LOCK blockers and exit criteria
- [ ] Formally approve Contract Alignment V1.1 and update the normative contract (the original V1 is not silently overridden).
- [ ] Provide named PASS evidence for HYC-04, HYC-07 reorder, HYC-10 precedence, HYC-24 lesson-progress, and HYC-27 rejection paths; record HYC-11 source-only/no-engine guarantee as approved or add a test.
- [ ] Decide whether HYC-01 explicitly accepts fixture-only provenance; otherwise provide a direct StudySession-generated checkpoint and attempts.
- [ ] Capture immutable code version identifiers (commit SHA or hashes) for the four Hydration modules and exact test suite at sign-off.
- [ ] Re-run complete suite on that exact code snapshot and record final test counts.

## Decision
**NOT LOCKED** until all blockers are resolved or explicitly waived in an approved revision. Do not start executable Session Restoration (Phase 3.3-C) on the assumption that this manifest is final.
