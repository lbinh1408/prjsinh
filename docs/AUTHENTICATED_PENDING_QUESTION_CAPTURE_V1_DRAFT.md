# Pending Question Capture Preflight V1 — DRAFT

This patch deliberately implements **preflight only**, not authenticated durable capture. It reuses the existing live session revision fence and pending question validator without modifying locked modules.

## API

`preflightPendingQuestionCapture({ authority, capture, checkpointFromSnapshot })`

- `authority`: existing `createLiveSessionRevisionAuthority` instance.
- `capture`: result from `authority.capture({ expectedRevision, readSnapshot })`.
- `checkpointFromSnapshot`: synchronous pure projection of captured session to checkpoint; must set `revision` and `attemptIds`.
- Output: read-only validation receipt, always `executable:false`, `submitAuthorized:false`, `inFlightSubmitExcluded:false`, `authenticatedEnvelopeVerified:false`, `durableCommitPerformed:false`.

## Security boundary

This only proves that the shape of the selected pending question is consistent under the **cooperative, single-process** fence. It does not prove that all submit paths use the authority, that no external attempt exists, or that an authenticated envelope has been persisted. A caller must never treat the receipt as a permit to resume/submit/persist.

The locked `restorationSnapshotExtension.js` still routes pending deliveries to `validatePendingContentCapture` and rejects question pending. To support persisted question captures, design a **separately versioned extension and read-side validator**; do not weaken content V1.1.

## Install

Copy only `src/restoration/authenticatedPendingQuestionCapture.js` and `tests/unit/restoration/authenticatedPendingQuestionCapture.test.mjs` into the corresponding repo paths. The test imports existing locked modules from the repository; do not copy or replace them. Run:

`node --test tests/unit/restoration/authenticatedPendingQuestionCapture.test.mjs`

`node --test tests/unit/restoration/*.test.mjs`

The six tests passed in an isolated harness with uploaded module versions. Repository regression is not yet verified. The earlier 338 tests are the user's reported baseline, not a guaranteed fixed count.

## Before durable integration

1. Establish an authoritative submit lifecycle or attempt ledger fence, including in-flight/uncertain states and external writers.
2. Ensure every StudySession submit mutation routes through the same authority.
3. Introduce a versioned question-specific snapshot extension and pre-auth read-side checks.
4. Verify checkpoint/extension/content manifest/HMAC and durable attempt absence atomically enough for the threat model.
5. Add crash/replay/double-submit/integration tests. Remain non-executable until a separate resume permit contract is established.

## Existing signing path

`persistPreAuthenticatedCapture` prepares the fixture, signs the prepared envelope and writes the signed envelope. The unused `signCaptureEnvelope` return value in `persistFencedAuthenticatedCapture` is a redundant invocation; it does not by itself show an unsigned disk write. This patch does not change that locked path.
