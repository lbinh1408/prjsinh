# Durable Attempt Store V1 — DRAFT

## Integration
Copy `src/persistence/durableAttemptStore.js` and `tests/unit/persistence/durableAttemptStore.test.mjs` into matching project paths. Import `createDurableAttemptStore` and supply a private absolute `rootDir`. No existing LOCKED module is changed.

## Contract
- Global attemptId ownership across all sessions in a single root.
- Same ID + identical canonical payload is idempotent; divergent payload or session is ATTEMPT_CONFLICT.
- One complete JSON record is replaced atomically using temp write, file fsync, rename, directory fsync.
- Per-root lock directory serializes cooperating processes. Incomplete or stale locks are not automatically reclaimed; operator intervention is required after proving the owner is dead.
- Reads validate the entire store and fail closed on corruption. A read is not authenticated against malicious filesystem edits.
- The attempt payload is detached and JSON-only. `listAttemptIds` preserves global append order filtered per session.

## Explicit limitations
- No atomic transaction with StudySession, Submit Lifecycle Fence, capture store, or journal. A successful append is NOT authorization to resume.
- An exception after rename may mean the Attempt was written. Reconcile by reading the durable store; never automatically re-submit.
- Assumes a local filesystem with reliable atomic rename and fsync, exclusively controlled root directory. No NFS, hostile filesystem, power-loss proof, or global distributed atomicity claims.
- One global record is rewritten per append: bounded prototype, not suitable for unbounded production volume.
- An unclean process crash can leave a lock; this implementation intentionally does not auto-steal it.
- `durable: true` means filesystem-backed storage, not independently proven crash/power durability.
- Tests include simulated failure points and concurrent child processes; they do not constitute a real power-loss test.

## Test
`node --test tests/unit/persistence/durableAttemptStore.test.mjs`

Do not LOCK until real-repository regression, integration tests, crash recovery procedure, and threat model review.
