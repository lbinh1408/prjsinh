# AI Handoff Test Guide

## Latest reported results

These are results reported by the preceding implementation turn, not tests run
during creation of this handoff:

| Coverage | Command | Reported result |
|---|---|---:|
| Transient capture transport and adapter regressions | `node --test tests/unit/restoration/k283PersistentMultiTurnCoordinatorV1.capture.test.mjs tests/unit/restoration/submitCheckpointIntegrationV1.test.mjs tests/unit/restoration/multiAttemptIntegrationV2.test.mjs` | 37/37 passed |
| StudySession and V1 fingerprint regressions | `node --test tests/unit/orchestration/studySession.test.js tests/unit/orchestration/remediationStopFingerprint.test.js` | 40/40 passed |
| Durable remediation and K283 lifecycle regressions | `node --test tests/integration/k283ConfirmedFailureRemediationE2E.integration.test.mjs tests/integration/k283GoldenLifecycleV1.integration.test.js` | 25/25 passed |

## Focused commands

The repository `package.json` declares `"type": "module"` and no npm scripts.
Run focused tests directly with Node's test runner:

```sh
node --test tests/unit/orchestration/remediationStopFingerprint.test.js
node --test tests/unit/orchestration/remediationStopProvenance.test.js
node --test tests/unit/orchestration/studySession.test.js
node --test tests/unit/restoration/k283PersistentMultiTurnCoordinatorV1.capture.test.mjs
node --test tests/unit/restoration/multiAttemptIntegrationV2.test.mjs
node --test tests/unit/restoration/submitCheckpointIntegrationV1.test.mjs
node --test tests/unit/persistence/checkpointCodec.test.js
node --test tests/unit/restoration/durableSessionCommitV1.test.mjs
```

The durable-wrapper test path above was verified in this checkout. A broader
immediate regression set is the three combined commands in the table above.

## Regression expectations for atomic wrapper integration

- `FPV1-INF-K283` and `FPV1-POLICY-K283` remain exact; genuine stop capture digest
  equals the independently recomputed V1 digest of its own captured inputs.
- New capture is passed by identity/value to durable commit without reconstruction;
  commit binds it to the actual checkpoint and matching submitted Attempt.
- No-capture submissions preserve existing durable wrapper behavior and bytes
  (aside from any explicitly optional wrapper member, which should be absent).
- Historical wrappers lacking provenance remain readable, with no claim of
  provenance verification.
- Invalid supplied capture/provenance fails closed; failure before/after rename
  never creates a separate provenance/checkpoint state or authorizes retry.
- Checkpoint V1 exact stop fields and validation remain unchanged; stop extensions
  stay mutually exclusive and POLICY_ERROR keeps null selection/question.
- Attempt/journal order, committed Attempt/mastery/Adaptive state, no replay,
  selection suppression and M4/stable-to-SKIP lifecycle remain unchanged.
- V2 generation remains disabled; verifier support alone does not permit retry,
  remediation regeneration, selection, or restart execution.
