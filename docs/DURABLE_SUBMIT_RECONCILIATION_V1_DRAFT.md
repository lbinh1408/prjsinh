# Durable Submit Reconciliation V1 — DRAFT

This is a conservative local submit-intent journal, **not** a transactional Attempt store.

## Contract
- PREPARED means a durable local intent was recorded, not that no external Attempt was committed.
- COMMIT_UNKNOWN blocks retries until an independent authoritative durable Attempt store is reconciled.
- COMMITTED means a caller-supplied verifier accepted a receipt. The journal does not independently validate the verifier or establish cross-store atomicity.
- All outputs are `executable: false`, and no API authorizes retry.

## Limitations
- Single process / application-owned local filesystem; no multi-process locking or CAS. Do not use concurrently.
- SHA-256 detects accidental corruption, not malicious tampering; HMAC authentication is not implemented here.
- One journal record per session; no new attempts supported until a versioned append-only or per-attempt journal is designed.
- A crash between rename and directory fsync leaves durability uncertain. Do not infer absence from a missing record.
- Not connected to StudySession, AttemptStore, capture envelope, or any LOCKED module.
- This draft is a safety prototype; **not production-ready**.

## Test
`node --test tests/unit/restoration/durableSubmitReconciliation.test.mjs`
