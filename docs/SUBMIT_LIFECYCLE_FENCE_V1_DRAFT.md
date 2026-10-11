# Submit Lifecycle Fence V1 — DRAFT

A cooperative, single-process, synchronous wrapper around StudySession.submitAnswer and an injected Attempt persistence callback. No LOCKED module is modified.

- IDLE permits pre-submit capture under the same authority.
- SUBMITTING blocks capture and competing submit.
- COMMIT_UNKNOWN blocks all further operations, even when evaluation or persistence fails; manual reconciliation required.
- COMMITTED blocks duplicate submit and pending capture.

## Important limitations

1. The coordinator cannot prevent bypass calls to `submitAnswer` or external writers. All writers must use the same authority/coordinator.
2. An in-memory AttemptStore is not durable; receipt cannot prove durable commit. `durableCommitProven` is always false.
3. No crash recovery or restart proof. An IDLE coordinator freshly created after a crash is not evidence that a prior submit did not occur.
4. `persistAttempt` is invoked before the authority's session commit. A successful external write followed by authority failure creates COMMIT_UNKNOWN; reconcile externally.
5. No persistence of lifecycle phase is implemented; no automatic retry or resume authorization.
6. This does not integrate Pending Question capture with the LOCKED snapshot extension. All results remain `executable:false`.

## Run

`node --test tests/unit/restoration/submitLifecycleFence.test.mjs`

## Next gate

Durable lifecycle journal / recovery reconciliation with real store, crash-injection tests, and read-side contract before enabling authenticated durable pending-question capture.
