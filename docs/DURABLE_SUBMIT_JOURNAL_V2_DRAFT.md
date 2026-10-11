# Durable Submit Journal V2 — DRAFT

## Installation
Copy `src/restoration/durableSubmitJournalV2.js` and `tests/unit/restoration/durableSubmitJournalV2.test.mjs` into the same paths in your repository. The test imports your existing `src/persistence/durableAttemptStore.js`. No existing LOCKED files are changed.

Run `node --test tests/unit/restoration/durableSubmitJournalV2.test.mjs` then your full regression suite.

## API
`createDurableSubmitJournalV2({ rootDir, attemptStore, lockTimeoutMs?, lockPollMs?, failpoint? })` returns `{prepare, markUnknown, reconcile, read}`.

- `prepare({sessionId, attempt, expectedRevision})`: persist expected attempt SHA-256 before attempting external append. Requires the canonical Attempt already built. Never use this to authorize execution.
- `markUnknown({sessionId,attemptId})`: mark uncertain outcome, no retry.
- `reconcile({sessionId})`: read matching Attempt from supplied durable store, compare canonical payload digest, and mark COMMITTED only when matching. Absence is not evidence of no commit. Mismatch throws.
- `read(sessionId)`: validated detached journal record, or null.

## Safety boundaries
- Single-host, trusted application-owned local filesystem only. Advisory/cooperative per-session lock. No auto stale-lock recovery; manual operational intervention needed after crash while holding lock.
- Journal and Attempt Store are NOT one atomic transaction. Lock ordering and global isolation across stores are NOT established. All writers must coordinate at application level.
- SHA-256 detects accidental modifications, not malicious tampering or external provenance.
- `externalAttemptCommitVerified: true` means only that the supplied Attempt store returned a matching payload at reconciliation time; it is NOT a cryptographic attestation of physical durability or external transaction finality.
- `safeToRetry:false` and `executable:false` always. No resume, no submit authorization, no automated retry.
- `PREPARED` journal can be persisted even if no Attempt exists; this is intentionally not treated as safe to retry.
- A crash before prepare is durably recorded is outside this journal's proof boundary.
- Journal retains one intent per session; subsequent turns require an explicit future lifecycle/rotation contract.
- Use a distinct journal root and Attempt Store root. Never place journal files in Attempt Store's own root.
- V2 does not integrate with Submit Lifecycle Fence V1 or authenticated capture; future integration must preserve the ordering and same authority.
