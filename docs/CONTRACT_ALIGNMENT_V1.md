# Phase 3.3-B Contract Alignment — proposed V1 amendment

Status: REVIEW CANDIDATE, NOT LOCKED.

1. Attempt ownership (G07): attempt.attemptId must equal the ID requested through AttemptStore. If the payload has an own `sessionId` property, it must equal the hydration request sessionId. If the property is absent, ownership is established by the AttemptStore session-scoped read and its documented global ownership invariant. Do not relax the rule for arbitrary untrusted adapters.

2. Error precedence: Invalid request -> missing checkpoint -> reader observation inconsistencies -> codec malformed checkpoint -> session identity -> attempt sequence -> attempt identity -> content references -> supported runtime/state versions -> completeness. `checkpoint.schemaVersion` is special: codec rejects unsupported versions, so map that codec rejection to `INVALID_CHECKPOINT` unless a future version-aware codec API can distinguish an otherwise valid but unsupported schema. Do not promise `UNSUPPORTED_VERSION` for codec-incompatible checkpoint schemas.

3. Consistency: V1's two-pass reader rechecks checkpoint/revision/attempt IDs but not payload bodies. This is acceptable ONLY with locked in-memory append-only AttemptStore V1. No atomic snapshot, no payload race guarantee for arbitrary adapters, and no durability guarantee. Do not claim successful hydration proves actual content SHA integrity or runnable runtime continuity.

4. HYC-01 K283 fixture is accepted as a real-shaped persisted fixture; provenance from live StudySession execution remains unproven without capture evidence.

5. HYC-27 no partial candidate is returned on failure. Typed errors must not embed answer values. The code currently exposes an external error's `code` as `details.causeCode`; audit that value for possible sensitive data before LOCK.

6. `validateHydrationRequest` is invoked twice (Planner and Reader); document this as intentional defense in depth or remove the duplicate in a later contract-compatible revision.
