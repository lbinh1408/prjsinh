# Phase 3.3-C — Session Restoration Contract V1 (C1)

**Status:** DRAFT / C1 implementation; **NOT LOCKED**.
**Upstream baseline:** Phase 3.3-B scoped LOCK, commit `311c30acfb8d4b199e9bdb0942878cf6651ad835` (user-reported 98/98 tests PASS).

## Scope
C1 defines a read-only, synchronous *preflight contract* for a Hydration V1 restoration candidate. It **does not restore** or claim the ability to resume a StudySession.

## Inputs
`validateRestorationRequest({ candidate, contentBundle, adapter })`.
- `candidate`: from `planHydration()` with `status: ready-for-restoration`, `executable: false`, expected compatibility and verification flags.
- `contentBundle`: actual runtime content (structurally a record in C1; hash/reference verification deferred to C2).
- `adapter`: an explicit `{restore(...)}` interface (only presence validated in C1). This does **not** imply a valid adapter exists.

## Guarantees
- C1 rejects malformed candidate metadata, incompatible runtime version, and inconsistent checkpoint metadata.
- C1 performs no stores writes, no engine calls, no restoration, and no attempt replay.
- C1 does not promote hydration non-guarantees to guarantees.
- Errors use stable codes and sanitized details.

## Deferred blocking gates before execution (C2/C3)
1. Verify candidate provenance and content bundle IDs/versions and SHA-256 of real bytes; zero hashes in K283 fixture are placeholders, **not proof of integrity**.
2. Establish trusted adapter capability to recreate full StudySession internal state; `createStudySession()` is **not** automatically a restoration API.
3. Validate complete runtime state, cursor, question history, lesson progress, timing and mastery continuity without replay.
4. Define side-effect isolation, rollback/cleanup and postcondition verification; never return a partially restored session.
5. Define consistency assumptions for the non-atomic cross-store hydration snapshot and document limitations.

## Explicit non-goals
No modifications to locked StudySession V0.2.0, Persistence V1, Mastery Engine V2, Knowledge Map V4, or Phase 3.3-B. No production restoration yet.

## Gate to C2
C1 unit tests PASS; then review runtime snapshot shape and real content artifact contract before implementing content verification.
