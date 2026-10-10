# Fenced Authenticated Capture Transaction V1

- New file: `src/restoration/fencedAuthenticatedCaptureTransaction.js`.
- Requires existing `liveSessionRevisionAuthority.js`, `authenticatedPersistedIntegration.js`, `authenticatedCaptureAuthority.js` and their prior dependencies.
- `assembleFixture` must derive the fixture from the detached fenced snapshot and return `{envelope, bindings, contentBundle}` with envelope binding sessionId/revision equal to the authority. Callers must ensure actual content corresponds to snapshot; this API cannot independently prove derivation.
- Prepares manifest, signs HMAC, revalidates fence, commits synchronously using existing persisted capture API, then checks fence again.
- If a reentrant hook mutates authority during persistence, a commit may already be visible; `fenceValidAfterCommit:false` indicates uncertainty. It is NOT rollback. No `executable:true`.
- Existing revision authority is cooperative, process-local, synchronous. External writers and direct StudySession mutations bypass it. This is NOT a global atomic capture transaction, nor a guarantee of rollback or snapshot provenance.
- Tests use a stub persistence callback; they prove orchestration behavior, not actual disk integration. Prior disk and HMAC tests remain required.
- Integration: unzip into repository root and run `node --test tests/unit/restoration/fencedAuthenticatedCaptureTransaction.test.mjs`.
