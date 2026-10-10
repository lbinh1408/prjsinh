# Phase 3.3-C — Atomic Capture & Persistence Protocol V1 (DRAFT)

## Scope
- Captures a checkpoint and extension bound to one *caller-provided* live snapshot, with exact canonical SHA-256 bindings.
- Reference store uses a **single-record synchronous compare-and-swap**; checkpoint and extension are stored together in one serialized record. It is process-local and loses data on restart.
- An external storage adapter must provide a **real durable atomic single-record transaction** and revision CAS. The protocol cannot independently prove that an arbitrary adapter meets these requirements.
- No changes to StudySession V0.2.0, Persistence V1, or CheckpointCodec V1.

## APIs
- `prepareAtomicCapture({checkpoint, liveSnapshot})` validates and creates a detached envelope.
- `createInMemoryAtomicCaptureStore()` reference CAS implementation for tests only.
- `commitAtomicCapture({store,envelope,expectedRevision})` delegates a single-record commit and validates the response.
- `readAtomicCapture({store,sessionId})` reads a bound record and verifies extension integrity.

## Guarantees and non-guarantees
- A **single** reference-store commit cannot expose a partial envelope to the same in-process store. Duplicate identical writes are idempotent; stale revisions fail.
- The capture cannot ensure the source checkpoint and liveSnapshot were taken in one atomic transaction; they must come from a stable snapshot boundary upstream.
- No multi-store transaction is performed. This is NOT a replacement for PersistenceCoordinator and does not retroactively make its checkpoint/attempt writes atomic.
- `externalAtomicityVerified`, `storageDurabilityVerified`, `executable` are always `false`.
- No content provenance, real content byte integrity, restoration adapter, replay, or behavioral equivalence is asserted.
- The extension includes attempts and lastFlowResult, but full dependencies still require independently verified content bytes.

## Production acceptance gate
1. Implement durable single-record store (e.g. database transaction with unique session ID and revision CAS).
2. Verify crash-recovery, concurrent writers, stale revision and torn-write failure injection.
3. Bind stored attempt data and content bytes to the same logical revision, or use an immutable content-addressed manifest and transactional references.
4. Re-run C1/C2, boundary, extension, dependency gate, and real-runtime behavioral equivalence before C3 LOCK.
