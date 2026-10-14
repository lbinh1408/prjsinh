# AI Coding Handoff

## Purpose and frozen baseline boundary

This repository contains a K283 learning runtime and audited durability/restoration components.
The informational V1 remediation stop provenance pipeline is now fully implemented, tested, and frozen.
The pipeline captures authoritative generation inputs, binds them durably to the checkpoint in the wrapper layer,
transports them across session restart, and classifies them against current configuration for informational comparison only.
V2 generation, AUTHORED migration, and automatic retry/resume remain disabled in the frozen V1 baseline.

## End-to-end data flow

1. **Stop Generation (`src/engines/orchestration/studySession.js`)**:
   - Following an Adaptive `REMEDIATE` decision, `learningFlow.js` invokes the remediation generator.
   - For `INFEASIBLE` (e.g. no eligible bank question) or `POLICY_ERROR` (e.g. policy constraint conflict),
     StudySession attaches the appropriate stop extension (`remediationGenerationStop` or `remediationPolicyErrorStop`).
   - StudySession captures exact canonical generation inputs, computes the V1 fingerprint, and returns a frozen,
     one-submit `remediationStopCapture` alongside the submit result.

2. **Coordinator Transport (`src/restoration/k283PersistentMultiTurnCoordinatorV1.js`)**:
   - The persistent coordinator validates the transient capture against attempt identity, session ID,
     stop extension fields, bank/policy identities, and recomputed V1 digest.
   - It prepares the journal entry, appends the attempt, reconciles the journal, mutates session authority,
     and forwards the capture to `durableCommit.commit`.

3. **Atomic Wrapper Persistence (`src/restoration/durableSessionCommitV1.js`)**:
   - `durableCommit.commit` validates that the capture matches the committed trigger attempt and checkpoint stop.
   - It invokes `createRemediationStopProvenance` to bind `sessionId`, `checkpointRevision`, `checkpointPayloadSha256`,
     and `generationInputs` with `fingerprintContract: 'V1'` and `participation: null`.
   - The wrapper is written to a temporary file, fsynced, and atomically renamed onto the final wrapper file
     in `checkpoints/<sessionSha>.json`.
   - `durableCommit.read` validates the wrapper schema and verifies provenance against the checkpoint payload SHA-256
     and stop extension. Corrupt provenance fails with `SESSION_COMMIT_CORRUPT`. Legacy wrappers without provenance
     read cleanly without provenance.

4. **Progress Continuation (`k283ProgressContinuationV1.js`)**:
   - `findLatestVerifiedK283Progress` audits the durable checkpoint against AttemptStore and SubmitJournal.
   - It checks content reference identity and extracts frozen `remediationProvenance`:
     `status: 'VERIFIED'` if present and validated by durable read, or `'ABSENT_UNVERIFIED'` if omitted.

5. **Bootstrap Classification (`k283AdaptiveBootstrapV1.js` & `src/engines/orchestration/remediationStopClassifierV1.js`)**:
   - `classifyBootstrapRemediationStop` passes the verified provenance and checkpoint to the pure classifier.
   - `classifyRemediationStopV1` compares historical inputs against an independently constructed current snapshot:
     - `CURRENT_MATCH` (`reasonCode: 'V1_FINGERPRINT_MATCH'`) when generation inputs match.
     - `RETRY_ELIGIBLE` (`reasonCode: 'V1_FINGERPRINT_CHANGED'`) when comparable V1 inputs have drifted.
     - `FAIL_CLOSED` (`reasonCode: 'INVALID_OR_UNSUPPORTED_COMPARISON'`) when inputs are incomparable,
       provenance is absent/unverified, or validation checks fail.
   - In all outcomes, all authorization flags (`retryAuthorized`, `resumeAuthorized`, `remediationGenerationAuthorized`,
     `migrationAuthorized`, `executable`) are strictly `false`.
   - Committed attempts are never replayed into the session (`session.attempts === []`). Question selection
     remains suppressed, and M4/stable state derives `SKIP`.

## Key modules

- `src/engines/orchestration/remediationStopFingerprint.js`: Shared historical V1 fingerprint functions and explicit V2 digest library.
- `src/engines/orchestration/remediationStopProvenance.js`: Pure V1 envelope encoder and verifier with strict session/revision/SHA/stop bindings.
- `src/engines/orchestration/remediationStopClassifierV1.js`: Pure informational V1 classifier evaluating `CURRENT_MATCH`, `RETRY_ELIGIBLE`, and `FAIL_CLOSED`.
- `src/persistence/checkpointCodec.js`: Checkpoint encoding, decoding, and validation for mutually exclusive stop extensions.
- `src/restoration/durableSessionCommitV1.js`: Atomic durable wrapper commit, fsync, rename, read verification, and audit.
- `src/restoration/k283PersistentMultiTurnCoordinatorV1.js`: Multi-turn coordinator sequencing attempts, journal, and durable commit.
- `k283ProgressContinuationV1.js`: Authoritative progress discovery, journal reconciliation audit, and content reference verification.
- `k283AdaptiveBootstrapV1.js`: Bootstrap decision, provenance handoff, and classification adapter.
- `liveStudyK283PersistentMultiTurnV1.js`: Live study CLI runtime initialization with classification attachment.
- `tests/integration/k283FreshProcessRemediationProvenanceE2E.integration.test.mjs`: Fresh-process restart E2E test suite.
- `tests/integration/k283FreshProcessRemediationProvenanceE2E.worker.mjs`: Separate Node.js process worker harness.

## Locked compatibility and behavioral constraints

- Checkpoint V1 stop extension fields remain unchanged; no provenance fields are stored in `checkpoint.extensions`.
- Historical generation inputs are preserved in the wrapper only and never reconstructed from current session configuration.
- Missing provenance on historical wrappers is explicitly `ABSENT_UNVERIFIED` and fails closed on comparison.
- Never replay attempt evaluation, mastery updates, or Adaptive decisions during provenance verification or restart.
- Preserve INFEASIBLE and POLICY_ERROR mutual exclusion, stop suppression, legacy continuation, and M4/stable-to-SKIP.
- V2 generation, AUTHORED migration, and automatic retry/resume remain disabled in the frozen V1 baseline.

## Known limitations

1. **Optional Provenance Deletion**: Whole-member removal of `remediationStopProvenance` leaves a readable legacy wrapper that yields `ABSENT_UNVERIFIED`.
2. **Rollback**: In-place atomic replacement retains only the latest committed revision.
3. **Authenticity**: Local SHA-256 payload binding verifies consistency within the host boundary, not external cryptographic signature or hardware attestation.
4. **Cross-Store Atomicity**: AttemptStore, SubmitJournal, and Checkpoint stores are coordinated cooperatively via mutex lockfiles, not a distributed two-phase commit transaction.
5. **Power-Loss Safety**: Process-level failpoints verify execution interruption safety, not catastrophic kernel panic or storage power interruption during fsync.
6. **Concurrent Writers**: Fencing relies on single-writer lockfile ownership; stale locks require timeout expiration before recovery.
