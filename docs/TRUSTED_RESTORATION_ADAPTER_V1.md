# Phase 3.3-C — Trusted Restoration Adapter V1: Guarded Reconstruction

## Scope

- `reconstructGuardedStudySession({envelope,contentBundle,bindings})` validates the atomic-record envelope binding, snapshot extension, dependency coverage and actual SHA-256 content bytes, then assembles a detached StudySession-shaped candidate.
- `compareGuardedCandidateToLive({guarded,liveSnapshot})` checks all 13 top-level fields against a live snapshot; this is **structural**, not behavioral equivalence.
- All outputs set `executable:false`. Do not pass `candidate` into `getNextQuestion`, `submitAnswer`, or any StudySession API in production.
- No changes to LOCKED StudySession V0.2.0, CheckpointCodec V1 or persistence modules.

## Required inputs

The atomic envelope produced by `prepareAtomicCapture`, a `contentBundle` of `{id,version,bytes:Uint8Array}` entries, and exact dependency-to-ref `bindings` matching Dependency Coverage V1. Content is parsed from the bytes after SHA-256 verification. Caller-provided provenance is not trusted.

## Known gaps / gate to executable

- A matching hash is not an independent proof of authorship, nor of capture-time consistency of external content.
- The atomic envelope must be read from a trusted durable store; this adapter cannot independently attest store provenance or power-loss safety.
- No true StudySession checkpoint rehydration API exists in the LOCKED runtime. This adapter assembles a detached candidate, not an authorized executable session.
- Real integration and behavioral equivalence on actual resumed session actions remain required.
- Fixture uses a synthetic minimal StudySession shape; 12 unit tests are not real-runtime integration tests.

## Run

`node --test tests/unit/restoration/trustedRestorationAdapter.test.mjs`

## Next

Build an isolated real-runtime continuity harness comparing the guarded candidate to a real StudySession snapshot, without executing the candidate; then design a separately authorized hydration boundary with explicit runtime-level invariants and real continuation tests.
