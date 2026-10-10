# Phase 3.3-C — Durable Atomic Store Adapter V1 (DRAFT)

## What this provides
A Node.js synchronous filesystem adapter with one file per session, lock-directory serialization for cooperating writers, expected-revision CAS, idempotent retry, write-to-temp + file fsync + atomic rename + directory fsync, and SHA-256 tamper detection. API is `createDurableAtomicCaptureStore({rootDir,validateEnvelope,lockTimeoutMs?,lockPollMs?,failpoint?})` returning `{commit({envelope,expectedRevision}),read({sessionId})}`. It conforms to `commitAtomicCapture` and `readAtomicCapture` from the preceding phase. **No changes to locked modules.**

## Integration (ESM)
```js
import {createDurableAtomicCaptureStore} from './src/restoration/durableAtomicStore.js';
import {readAtomicCapture,commitAtomicCapture} from './src/restoration/atomicCaptureProtocol.js';
// Reuse the Phase 3.3-C atomic envelope validator by routing through its read gate.
const validateEnvelope = envelope => {
  readAtomicCapture({store:{read:()=>({envelope})},sessionId:envelope.binding.sessionId});
};
const store=createDurableAtomicCaptureStore({rootDir:'/absolute/path/private/c3-captures',validateEnvelope});
const outcome=commitAtomicCapture({store,envelope,expectedRevision:0});
const record=readAtomicCapture({store,sessionId:envelope.binding.sessionId});
```
Do not put `rootDir` on an NFS/SMB/network filesystem; assume a local filesystem supporting atomic same-directory rename, reliable `fsync`, and atomic `mkdir`. Root directory must be exclusively controlled by the application and not writable by untrusted users. Directory symlinks and hostile filesystem mutation are outside the threat model.

## Failure semantics
- `afterTempFsync`: old record remains visible; orphan temp file removed on caught error.
- `afterRename`: new record is visible but commit reports failure; **retry same exact envelope** and observe idempotent result. The OS may crash before directory fsync; durability after this point is not established.
- Invalid/torn JSON or SHA mismatch: `DURABLE_CORRUPT_RECORD` (fail closed).
- Existing lock directories are **never auto-stolen**. An unclean process termination can strand a lock, blocking writes until an operator verifies no writer is alive and removes that specific lock directory. This is intentionally conservative; automated crash recovery and robust fencing remain future work.
- Writes are serialized only among processes using this adapter and its lock convention. A non-cooperating writer can corrupt data.
- Cross-store atomicity, snapshot source capture atomicity, provenance of content bytes, and actual StudySession restoration are NOT proven.
- This adapter deliberately reports `storageDurabilityVerified:false` in read metadata: the implementation uses fsync but cannot certify disk/hardware guarantees or power-loss behavior in a test environment.
- `executable:false` always.

## Test
```sh
node --test tests/unit/restoration/durableAtomicStore.test.mjs
```
18 independent tests including new-instance persistence, child-process read, CAS, idempotence, torn record, and injected failures. **This suite does not yet contain a real simultaneous multi-process writer stress test or power-loss test.** Do not LOCK C3 from this suite alone.

## Production gates still open
1. Multi-process simultaneous CAS stress test, and power-loss/crash tests on target storage.
2. Recovery of abandoned locks with owner identity, fencing and liveness validation (or use a transactional SQLite/Postgres store instead).
3. End-to-end real `prepareAtomicCapture` -> persisted envelope -> dependency verification -> trusted adapter -> real continuation equivalence.
