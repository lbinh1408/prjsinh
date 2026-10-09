# Phase 3.3-C — Checkpoint Boundary Contract V1

Status: DRAFT / NOT LOCKED / NON-EXECUTABLE.

This is a **structural preflight only**. It accepts post-submitAnswer-shaped checkpoints: no pending selection/question/lesson item; history tail aligns with attempt tail and currentDecision.action; progress has no overlapping completion/skip IDs; runtime/session/revision match. It rejects ambiguous and incomplete boundaries.

## previousAction
StudySession builds `previousAction` from `lastFlowResult.adaptiveDecision.action`. Following a successful `submitAnswer`, `currentDecision` is assigned from that same adaptiveDecision and the history tail records its `nextAction`. Thus equality of these two fields provides **corroboration**, not proof: both may have been fabricated or loaded from a non-atomic snapshot. This gate returns `previousActionCandidate`, never reconstructs `lastFlowResult` or marks runtime continuity verified.

## Known exclusions
The checkpoint codec excludes `lastFlowResult`, dependencies, lesson plan, and embedded attempts. This preflight does not reconstruct them. It does not verify byte hashes, adapter safety, atomicity, provenance, or next-turn equivalence. A checkpoint with no attempts is rejected in this V1 scope, including a freshly started session. It is intentionally conservative.

## Integration order
Hydration V1 -> C1 structural contract -> C2 content bytes verification -> this boundary preflight -> future trusted adapter/equivalence harness. Do not use a successful boundary result as executable authorization.

## Run
`node --test tests/unit/restoration/checkpointBoundary.test.mjs`
