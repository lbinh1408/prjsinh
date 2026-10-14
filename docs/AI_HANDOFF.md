# AI Coding Handoff

## Purpose and current boundary

This repository contains a K283 learning runtime and several deliberately limited
durability/restoration drafts. The active remediation-stop work captures the exact
inputs used for historical V1 stop fingerprints and transports that capture through
submit orchestration. It does **not** yet persist provenance in the durable wrapper.
V2 fingerprints are available in the shared library and provenance verifier, but
generation/classification remains on V1.

## End-to-end data flow

1. `src/engines/orchestration/learningFlow.js` calls the feasibility-aware
   remediation generator after an Adaptive `REMEDIATE` decision. It returns
   `INFEASIBLE`, `POLICY_ERROR`, or a plan; it does not persist a stop.
2. `src/engines/orchestration/studySession.js` commits LearningFlow results and
   creates a stop extension. For a newly generated INFEASIBLE or POLICY_ERROR
   stop, it canonicalizes the exact V1 fingerprint input, computes the digest from
   that snapshot, and returns a frozen transient `remediationStopCapture` alongside
   the submit result. The capture binds stop kind, digest, target, trigger Attempt
   ID, and generation inputs. It is not stored on the session or checkpoint.
3. In the K283 multi-turn path,
   `src/restoration/k283PersistentMultiTurnCoordinatorV1.js` validates the capture
   against the new submit result, stop extension, Attempt/session, bank/policy
   identity, and recomputed V1 digest. It forwards the same capture to
   `durableCommit.commit`.
4. In the submit-checkpoint path,
   `src/restoration/multiAttemptIntegrationV2.js` forwards the StudySession capture
   through its transient result. `src/restoration/submitCheckpointIntegrationV1.js`
   performs equivalent binding and digest checks and passes the capture as an
   explicit `durableCommit.commit` argument.
5. `src/restoration/durableSessionCommitV1.js` currently ignores that optional
   argument. It encodes a checkpoint, creates the existing wrapper, hashes the
   checkpoint payload, writes/fsyncs a temporary wrapper file, and atomically
   renames it. Consequently, the stop extension is checkpointed, but the
   generation-input capture/provenance is not.

## Key modules

- `src/engines/orchestration/remediationStopFingerprint.js` — shared historical
  V1 fingerprint functions and explicit V2 digest function. V1 INFEASIBLE hashes
  resolver/target/bank/content/selector/config/rules; V1 POLICY_ERROR also hashes
  the policy and its existing semantics marker. V2 is domain separated by stop
  kind and LEGACY/AUTHORED participation.
- `src/engines/orchestration/remediationStopProvenance.js` — pure V1 envelope
  encoder/verifier. It validates bindings and recomputes the named digest from
  explicitly supplied generation inputs. It is not wired into durable commit.
- `src/persistence/checkpointCodec.js` — checkpoint V1 projection and strict
  exact-field validation for the two stop extensions. It requires the two stop
  types to be mutually exclusive; POLICY_ERROR requires null selection/question.
- `src/restoration/durableSessionCommitV1.js` — `durable-session-commit-v1`
  wrapper around canonical checkpoint payload and SHA-256. The checkpoint revision
  is incremented by the commit path; the wrapper is replaced atomically by rename.
- `src/restoration/multiAttemptIntegrationV2.js`,
  `src/restoration/k283PersistentMultiTurnCoordinatorV1.js`, and
  `src/restoration/submitCheckpointIntegrationV1.js` — Attempt/journal/checkpoint
  sequencing and one-submit transient capture transport.
- `k283AdaptiveBootstrapV1.js` and `k283ProgressContinuationV1.js` — existing
  K283 continuation/bootstrap behavior; do not infer that transported inputs are
  available after restart.

## Locked compatibility and behavioral constraints

- Keep checkpoint V1 stop extension fields exactly as currently validated; do not
  add generation inputs or provenance members to `checkpoint.extensions`.
- Do not change committed Attempt bytes/order, mastery/evidence projection,
  Adaptive decision, history, selection null boundary, or active-plan behavior.
- Never replay Attempt evaluation, mastery updates, or Adaptive decisions during
  provenance verification or restart.
- Preserve INFEASIBLE/POLICY_ERROR distinction and mutual exclusion, stop
  suppression, legacy continuation behavior, and M4/stable-to-SKIP.
- Preserve exact V1 golden digests. V2 stays disabled for generation.
- A valid checkpoint payload hash proves payload integrity only. Recomputable
  generation inputs do not prove trusted generation-time capture or provide
  tamper-proof attestation.
- Keep old durable wrappers without provenance readable under existing behavior;
  do not fabricate missing historical inputs.

## Current risks and handoff caution

- Transient capture currently reaches the durable commit API but is discarded
  there. It cannot yet be recovered or verified after restart.
- The durable wrapper format currently contains only session/revision metadata,
  checkpoint payload and its SHA-256. Any provenance integration must preserve
  atomic replacement and make wrapper provenance consistent with the checkpoint
  revision, payload digest, stop, and trigger Attempt.
- The provenance V1 contract records stop fingerprint contract and participation
  explicitly; never infer either from hash shape. V1 participation is null;
  V2 participation is explicitly LEGACY or AUTHORED.
- Existing worktree changes predate this documentation task. Inspect `git status`
  before editing and avoid reverting or cleaning unrelated files/artifacts.
