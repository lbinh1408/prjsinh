# AI Task Handoff

## Completed milestones

- **P4d.3d–3f.2:** Shared remediation-stop V1/V2 fingerprint module integrated in
  StudySession, preflight and bootstrap for matching V1 inputs; golden V1 vectors
  are retained. V2 generation/classification is not enabled.
- **P4d.3g.1–3:** Read-only classifier and durable provenance architecture audits
  identified that checkpoint integrity alone does not prove generation-input
  provenance. Recommended wrapper-level optional provenance, atomically replaced
  with the checkpoint; checkpoint V1 stop fields remain unchanged.
- **P4d.3g.4a:** Added pure
  `src/engines/orchestration/remediationStopProvenance.js` and focused tests.
  It validates explicit session/revision/payload-hash/stop bindings and recomputes
  the declared V1 or V2 digest.
- **P4d.3g.4b.1–2:** Audited generation-time inputs, then added frozen,
  one-submit `remediationStopCapture` to StudySession results for genuine
  INFEASIBLE and POLICY_ERROR stops. The V1 digest is computed from the captured
  canonical inputs.
- **P4d.3g.4b.3:** Transported the unchanged capture through
  `multiAttemptIntegrationV2`, `k283PersistentMultiTurnCoordinatorV1`, and
  `submitCheckpointIntegrationV1` to `durableCommit.commit`. Receivers verify
  Attempt/session, stop kind/fingerprint/target/trigger, bank/policy identity,
  deep immutability, and V1 digest.
- **P4d.3g.4c:** Atomic wrapper integration in `src/restoration/durableSessionCommitV1.js`.
  Durable commit validates bindings, creates `remediationStopProvenance`, and replaces
  the durable wrapper atomically via temporary file, fsync, and rename. Durable read
  verifies wrapper provenance against checkpoint payload SHA-256 and stop fields;
  legacy wrappers without provenance remain readable as `ABSENT_UNVERIFIED`.
- **P4d.3g.4d.1–2:** Transported verified remediation provenance through
  `k283ProgressContinuationV1.js` (with journal/attempt sequence audit) and
  `k283AdaptiveBootstrapV1.js` without recomputing historical inputs or replaying attempts.
- **P4d.3g.4e:** Added pure informational classifier
  `src/engines/orchestration/remediationStopClassifierV1.js` and bootstrap adapter
  `classifyBootstrapRemediationStop`. Evaluates `CURRENT_MATCH` vs `RETRY_ELIGIBLE`
  (fingerprint change) vs `FAIL_CLOSED`. All authorization flags remain strictly false.
- **P4d.3g.4f.2:** Implemented fresh-process restart-level E2E coverage across 10 scenarios
  in `tests/integration/k283FreshProcessRemediationProvenanceE2E.integration.test.mjs`
  using genuinely isolated Node.js child processes for Process A and Process B.
- **P4d.3g.4f.3:** Frozen informational V1 baseline checkpoint. Verified test suites,
  documented contracts, invariants, and known limitations.

## Frozen V1 baseline contracts and invariants

1. **Stop Extensions**:
   - `checkpoint.extensions.remediationGenerationStop` (for `INFEASIBLE`)
   - `checkpoint.extensions.remediationPolicyErrorStop` (for `POLICY_ERROR`)
   - Mutually exclusive; checkpointCodec V1 schema unchanged.
2. **Provenance Envelope**:
   - Optional property `remediationStopProvenance` on the `durable-session-commit-v1` wrapper.
   - Strictly bound to `sessionId`, `checkpointRevision`, `checkpointPayloadSha256`, and stop metadata.
   - `fingerprintContract: 'V1'`, `participation: null`.
3. **Continuation & Bootstrap**:
   - Missing provenance is explicitly `ABSENT_UNVERIFIED` and fails closed on classification.
   - Tampered / corrupt provenance causes fatal read failure (`SESSION_COMMIT_CORRUPT`).
   - Historical inputs are never reconstructed or inferred from mutable runtime state.
   - Committed attempts and journal entries are never replayed or re-evaluated (`session.attempts === []`).
   - Stop suppression blocks selection; M4/stable derives `SKIP`.
4. **Informational Classification**:
   - `CURRENT_MATCH` (`V1_FINGERPRINT_MATCH`)
   - `RETRY_ELIGIBLE` (`V1_FINGERPRINT_CHANGED`)
   - `FAIL_CLOSED` (`INVALID_OR_UNSUPPORTED_COMPARISON`)
   - All authorization flags (`retryAuthorized`, `resumeAuthorized`, `remediationGenerationAuthorized`,
     `migrationAuthorized`, `executable`) remain strictly `false`.

## Explicitly disabled capabilities

- **V2 Generation**: Disabled in the frozen V1 baseline. No V2 digests or domain separation generated for active sessions.
- **AUTHORED Migration**: Disabled in the frozen V1 baseline. Historical V1 stops cannot be converted to V2 or AUTHORED.
- **Automatic Retry / Resume**: Disabled in the frozen V1 baseline. Classification results are informational only; no
  automatic retry, re-execution, or session resumption is permitted.

## Known limitations

1. **Optional Provenance Deletion**: Deleting the `remediationStopProvenance` member leaves
   a valid legacy wrapper that reads as `ABSENT_UNVERIFIED`. The checkpoint payload hash
   covers `checkpointPayload`, not the optional wrapper envelope.
2. **Rollback / Historical Snapshotting**: In-place wrapper replacement maintains only the
   latest committed checkpoint revision; prior revisions are not retained in an append log.
3. **Authenticity & Non-Repudiation**: Payload SHA-256 proves local snapshot consistency,
   not cryptographic signing, public-key authentication, or hardware attestation.
4. **Cross-Store Atomicity**: AttemptStore, SubmitJournal, and CheckpointWrapper writes
   are individually atomic on filesystem rename, but cross-store synchronization relies
   on cooperative coordinator locking rather than a multi-resource distributed transaction.
5. **Operating System Power-Loss Safety**: Exception injection tests (`afterTempFsync`,
   `afterRename`) verify process-level execution interruption and filesystem directory
   entry replacement, but do not guarantee safety against power loss or hardware failure.
6. **Concurrent Multi-Process Writers & Stale Locks**: Process fencing uses lockfile
   ownership with timeouts (`owner.json`). Stale locks from crashed processes must wait
   for timeout expiration before acquisition.
