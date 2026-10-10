# C3 Authenticated Capture Authority & Provenance V1

- New module: `src/restoration/authenticatedCaptureAuthority.js`; no locked engine edits.
- `signCaptureEnvelope`: HMAC-SHA256 with domain separation, caller-provided 32+ byte key and keyId; covers the full *unsigned envelope*, including binding/checkpoint/extension. Existing atomic manifest binding is appended at commit, and is separately validated by `readBoundCapture` (hash, sessionId, revision, dependency bytes).
- `persistAuthenticatedBoundCapture` wraps `persistBoundCapture` with signed envelope.
- `readAuthenticatedBoundCapture` wraps `readBoundCapture` and fails closed on missing/incorrect MAC before returning a candidate. The underlying pure reconstruction currently occurs before authentication; this is not a pre-parsing security boundary. Do not use for hostile inputs without a pre-authentication read API.
- `captureConsistentSnapshot` performs two synchronous reads and rejects differences; **not** atomic capture, cannot detect ABA or concurrent mutations between reads. No authenticated live capture guarantee.
- Keys MUST be provisioned externally and not saved alongside captures; keep keyId rotation mapping. HMAC proves knowledge of a shared secret, not identity of a specific process; no anti-replay/freshness guarantee beyond existing revision CAS.
- `externalProvenanceVerified:true` means MAC verified under the caller's trusted key resolver, NOT live snapshot atomicity. `authenticatedCaptureProven:false`, `atomicityProven:false`, `executable:false` remain.
- Store durability and blob atomicity have their own limitations; test on actual repo. Phase 3.3-C remains DRAFT.

Run: `node --test tests/unit/restoration/authenticatedCaptureAuthority.test.mjs`
