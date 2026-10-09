# Hydration Contract Alignment V1.1 — REVIEW CANDIDATE

Status: NOT LOCKED. Does not amend any LOCKED Persistence or StudySession module.

1. G07: attempt.attemptId must match the ID loaded; attempt.sessionId must match if present. Absent sessionId is permitted only for the session-scoped, globally owned, append-only AttemptStore V1. Do not generalize this guarantee to arbitrary adapters.
2. G03/G09: codec-invalid checkpoint (including unsupported checkpoint schema rejected by codec) maps to INVALID_CHECKPOINT. Runtime/state compatibility is checked after structural validation and may map to UNSUPPORTED_VERSION when codec permits the input.
3. Two-pass Reader checks revision, checkpoint and attempt ID sequence; it does not re-read attempt payloads and is not atomic. Its observational guarantees are valid only under the approved store assumptions.
4. All-zero SHA placeholders in K283 fixture do not establish content integrity; runtime continuity is not verified; fixture provenance from live StudySession execution remains unproven.
5. HYC-27: external store error messages and error.code must not be copied into public HydrationError details. Reader patch drops causeCode.
6. Request validation in Planner and Reader is intentionally duplicated for defense in depth. Request and adapter methods must remain stable for the duration of the synchronous call.
7. Tests with synthetic read adapters exercise error handling only; they do not expand the supported adapter set.

LOCK prerequisites: approve this alignment, map all HYC branches to named tests, confirm fixture provenance or explicitly accept fixture-based scope, rerun complete suite after patch.
