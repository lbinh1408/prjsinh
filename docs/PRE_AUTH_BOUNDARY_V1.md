# Phase 3.3-C — Pre-Authentication Read Boundary & Live Capture Consistency V1

## Threat boundary
`readPreAuthenticatedBoundCapture` first reads the durable envelope only, verifies HMAC with `verifyCaptureEnvelope`, and **only then** invokes existing `readBoundCapture` to load dependency blobs and reconstruct the guarded candidate. It compares envelope hashes and revision across both reads to reject an observed intervening commit. This is not a cryptographic transaction across reads, and a concurrent writer can still create a race unless writers are externally serialized.

## Capture consistency
`captureFencedLiveSnapshot` reads an externally maintained monotonic revision before and after two snapshots, optionally checking caller-supplied quiescence before and after. **StudySession V0.2.0 does not expose an atomic snapshot lock or monotonic mutation revision**; the caller must provide a real fence. A fake constant revision does not prove consistency. ABA mutation can escape detection without monotonic revision. `atomicityProven` is always false.

## Security caveats
HMAC proves possession of a shared secret, not who individually signed, live snapshot atomicity, freshness against rollback, or execution eligibility. The existing durable store validator may parse the envelope before HMAC verification; keep it bounded and fail-closed. The existing writer currently performs guarded reconstruction before signing; this module changes the **read** boundary only. No `executable:true` is ever emitted.

## Run
`node --test tests/unit/restoration/preAuthCaptureBoundary.test.mjs`

## Integration next
Add a full repository fixture with a signed committed envelope; mutate the HMAC tag and prove reconstruction is not invoked. Then wire a real mutation revision/quiescence primitive to StudySession's orchestrator without modifying LOCKED StudySession.
