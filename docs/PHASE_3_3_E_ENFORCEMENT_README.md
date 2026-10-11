# Phase 3.3-E — Coordinated Outer Boundary V1 (DRAFT)

This archive contains the original user-provided src.zip source plus ONE new opt-in source module and ONE test file. Existing source files were not modified.

## Why not silently patch all direct calls?
The provided source tree does not establish which application composition roots instantiate the integrations, nor that every external writer shares the same coordinator. Editing store implementations or nesting `withWriter` inside each direct call would break non-reentrant transactions and may change return contracts. This package therefore provides a safe opt-in outer transaction boundary rather than claiming mandatory enforcement.

## Usage
```js
import { createMandatoryCoordinationBoundaryV1 } from './restoration/mandatoryCoordinationBoundaryV1.js';
const guarded = createMandatoryCoordinationBoundaryV1({
  coordination, sessionId, integration: submitCheckpointIntegration,
  methods: ['submitOnce', 'audit']
});
// Route application calls through guarded, not through the raw integration.
```
For MultiAttemptIntegrationV2 use `methods: ['submitOnce','reconcile']`; for legacy SubmitPersistenceIntegration likewise. For PersistenceCoordinator use `methods: ['persistSession']` with an appropriate fixed sessionId, and ensure `persistSession` input's sessionId is checked. Do not nest wrappers. Do not wrap internal stores again.

## Security and limitations
- Opt-in composition only: direct raw store references still bypass this boundary.
- Capture is not atomic if non-cooperative writers exist.
- `journal.reconcile` and `durableCommit.audit` can mutate; outer `audit` must use this boundary.
- Crash, process races, and all actual composition roots are NOT yet covered by this package.
- No automatic retry/resume, no LOCK or production-ready claim.
- Integration `inspect` and `capturePreSubmit` are not wrapped; they are not a durable snapshot proof.

## Run
`node --test tests/unit/restoration/mandatoryCoordinationBoundaryV1.test.mjs`

Before deployment, provide the application bootstrap / composition root that constructs the store and integrations, plus its runtime entry points. Enforce only one coordinated facade at the outermost call site and add an actual multi-process bypass guard.
