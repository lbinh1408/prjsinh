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
  the declared V1 or V2 digest. No persistence integration.
- **P4d.3g.4b.1–2:** Audited generation-time inputs, then added frozen,
  one-submit `remediationStopCapture` to StudySession results for genuine
  INFEASIBLE and POLICY_ERROR stops. The V1 digest is computed from the captured
  canonical inputs.
- **P4d.3g.4b.3:** Transported the unchanged capture through
  `multiAttemptIntegrationV2`, `k283PersistentMultiTurnCoordinatorV1`, and
  `submitCheckpointIntegrationV1` to `durableCommit.commit`. Receivers verify
  Attempt/session, stop kind/fingerprint/target/trigger, bank/policy identity,
  deep immutability, and V1 digest.

## Current blockers / limits

- `src/restoration/durableSessionCommitV1.js` ignores `remediationStopCapture`.
  No provenance is persisted; existing wrapper/checkpoint formats and readback
  contain no generation input snapshot.
- Existing persisted stops therefore cannot gain verified historical generation
  inputs from current mutable runtime configuration. Keep legacy behavior; never
  synthesize provenance during restart.
- The capture is validated transiently but currently is not bound durably to the
  committed checkpoint revision/payload SHA or wrapper transaction.
- V2 fingerprints remain disabled for generation. The pure V2 provenance verifier
  is not an authorization to retry or resume.
- Worktree has pre-existing source, test, and `.k283-persistent-draft/` changes.
  Do not discard them as part of follow-up work.

## Exact next task — P4d.3g.4c Atomic Wrapper Integration

Integrate the existing transient capture with
`src/restoration/durableSessionCommitV1.js` and its directly related tests.
Use `createRemediationStopProvenance`/`verifyRemediationStopProvenance` from
`src/engines/orchestration/remediationStopProvenance.js`; do not recreate or
recompute generation inputs from current session configuration.

Required implementation decisions/tests for that task:

1. Store optional provenance at the durable wrapper layer, not in
   `checkpointCodec` V1 fields. Preserve the existing wrapper format and readers'
   compatibility with wrappers that omit provenance.
2. At commit, bind the captured stop to the requested session, next checkpoint
   revision, canonical encoded checkpoint payload SHA-256, and stop metadata in
   that checkpoint. Confirm the matching committed trigger Attempt ID is present
   in the checkpoint and aligns with the stop's `triggerAttemptId`.
3. Verify capture and build provenance before writing the temporary wrapper.
   Include checkpoint and provenance in the same canonical temporary wrapper
   bytes and existing fsync/rename replacement; never use a separate provenance
   file or a second non-atomic write.
4. On read, verify optional provenance against wrapper session/revision/checkpoint
   payload digest and checkpoint stop before returning it. Missing provenance
   on historical wrappers remains explicitly absent/unverified, not reconstructed.
5. Define fail-closed behavior for malformed/mismatched optional provenance while
   preserving normal reads of legacy wrappers with no provenance.
6. Test both stop kinds, exact captured-input preservation, wrong Attempt/session/
   revision/payload hash/stop bindings, tampered/missing optional fields, historical
   wrapper compatibility, and injected failures before/after rename. Assert there
   is no checkpoint/provenance split and no Attempt replay.
7. Keep checkpoint V1 bytes/fields, Attempt/journal ordering, mastery/Adaptive,
   no-replay behavior, stop suppression, M4/stable-to-SKIP, and V2-disabled
   behavior unchanged.

Do not start this next task without confirming the wrapper compatibility/error
policy in the implementation context. Do not modify bootstrap/continuation unless
that task's approved scope explicitly expands.
