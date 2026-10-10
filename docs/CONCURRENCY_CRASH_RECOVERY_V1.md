# Phase 3.3-C — Durable Store Concurrency & Crash Recovery V1

Status: DRAFT / NOT LOCKED. Never marks restored session executable.

## Integration

Replace only `src/restoration/durableAtomicStore.js` with the packaged implementation. Add `tests/unit/restoration/durableStoreConcurrency.test.mjs`. Existing `durableAtomicStore.test.mjs` remains unchanged.

```bash
node --test tests/unit/restoration/durableAtomicStore.test.mjs tests/unit/restoration/durableStoreConcurrency.test.mjs
```

## Contract

- `createDurableAtomicCaptureStore({rootDir,validateEnvelope,lockTimeoutMs,lockPollMs,recoverDeadLocks:false})`
- `recoverDeadLocks` is OPT-IN; defaults to false.
- Per-session lock directory contains fsynced `owner.json` with PID and random token.
- Recovery is serialized using a per-session `.recovery` mutex; only reclaims if OS reports ESRCH for recorded PID.
- EPERM, live PID, absent/invalid owner metadata, recovery mutex contention: fail closed / timeout.
- Writer removes lock only if token/PID match its own ownership.
- Commit uses temporary file + fsync + rename + parent directory fsync; CAS verified under lock.
- A post-rename error is an ambiguous commit; read revision and retry idempotently.

## Threat model and limits

This is for a trusted local single-host filesystem only. PID absence is not cryptographic provenance and does not prove process identity across hosts/containers or PID namespaces. Live PID reuse conservatively blocks reclamation. A crash between lock directory creation and owner metadata publication leaves an unrecoverable incomplete lock (manual operator recovery). A crash holding the recovery mutex also requires operator intervention. This implementation does not prove linearizability on NFS, power-loss durability on all hardware, or crash safety under arbitrary filesystem corruption. No trusted restoration adapter exists yet. Do not enable executable sessions based on these tests.

## Tests

18 existing durable tests + 12 new tests including actual 4-process CAS contention, cross-process dead-owner recovery, fail-closed live/unknown owner, injected failures, and isolation.
