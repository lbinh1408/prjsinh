# Phase 3.3-C — Behavioral Equivalence Harness V1

Status: DRAFT / NOT LOCKED. 20 isolated unit tests, using simulated continuation, not the LOCKED StudySession runtime.

## Purpose
Compare a reference session and a restored session at checkpoint, then after identical deterministic inputs and timestamps. Compare runtime, config, state, currentDecision, currentSelection, currentQuestion, lessonRuntime, activeRemediationPlan, attempts, history, masteryRuntime, lastFlowResult. No ignored fields by default. Object property order is irrelevant; array order is significant.

## API
`compareSessionContinuations({ original, restored, steps, advance, normalize? })`
- `steps`: nonempty array of `{ now: string, input: any }`, at most 100.
- `advance({session,input,now,branch,stepIndex})` returns `{session}` synchronously. Must be a side-effect-free wrapper around a deterministic, controlled continuation. The harness clones input/session but **cannot prevent external writes** inside a supplied callback.
- `normalize`: optional function to remove documented nondeterministic fields; avoid using unless audited. Its output must be an object.
- Returns `{equivalent, executable:false, stepsCompared, mismatches}`. The harness NEVER grants executable permission.

## Non-goals / known limitations
- No genuine restoration adapter is provided.
- Does not prove atomicity of persistence reads, trusted provenance of content, absence of side effects, or long-term behavioral equivalence beyond supplied steps.
- A malicious or incorrect callback can fabricate equivalence. Reference must come from a trusted live session and restoration from a separately audited adapter.
- Strict `runtime` comparison includes timestamps. Supply fixed `now` and avoid clock-dependent engines. If a field legitimately differs, document a narrowly scoped normalizer and its rationale.
- Does not change any LOCKED modules or the existing 44 tests.

## Run
`node --test tests/unit/restoration/behavioralEquivalence.test.mjs`

## Next acceptance milestone
Build a real integration fixture with captured StudySession V0.2.0 session at a safe boundary, checkpoint and independently verified dependencies; restore using a trusted adapter; feed both branches identical real `getNextStudyItem`/`submitAnswer` operations and compare all relevant fields. Without such an adapter, C3 remains NOT LOCKED.
