# Phase 3.3-C — Live Session Capture Fence & Revision Authority V1

## Scope
New, opt-in in-process **cooperative single-writer** authority. Does not modify LOCKED StudySession or persistence modules. It wraps plain StudySession snapshots and increments a monotonic revision for every accepted mutation (including no-op mutations). It refuses stale revision writes and reentrant callbacks. `capture()` runs synchronously under the same authority, returning a detached snapshot and revision-bound proof; `validateFencedCapture()` rejects stale proofs.

## Usage
```js
import {createLiveSessionRevisionAuthority,validateFencedCapture} from './src/restoration/liveSessionRevisionAuthority.js';
const authority=createLiveSessionRevisionAuthority({initialSession:studySessionSnapshot});
const {revision}=authority.inspect();
const capture=authority.capture({expectedRevision:revision,readSnapshot:s=>s});
validateFencedCapture({authority,capture});
// Build checkpoint + extension from capture.snapshot; persist using existing authenticated protocol.
// Recheck validateFencedCapture just before persistence; persist CAS must still enforce revision.
```

## Trust and limitations
- ALL mutations must go through `mutate()`. Direct writes to other copies, external engine calls, other processes, and cross-process writers are **not fenced**. This is an opt-in integration contract, not a guarantee about the unmodified StudySession runtime.
- The authority stores a cloned session; the application must use the authority's copy as the canonical live session. Otherwise it is only a detached simulation.
- Callbacks must be synchronous; async functions are rejected. Do not invoke asynchronous operations from inside callbacks. This does not provide process-wide locking or a durable monotonic counter.
- `validateFencedCapture()` is a point-in-time check, not a lock spanning a later disk commit. Persistence CAS, HMAC and atomic binding are separate requirements. A production capture transaction needs integration with a single writer and durable revision authority.
- SHA-256 of snapshot is an integrity check, not authentication. Capture fence metadata is not signed by this module. Do not treat it as trusted provenance.
- No authenticated persisted live session, no real in-flight resumed attempt, no execution permit is proven. `executable:false` always.

## Tests
`node --test tests/unit/restoration/liveSessionRevisionAuthority.test.mjs`
