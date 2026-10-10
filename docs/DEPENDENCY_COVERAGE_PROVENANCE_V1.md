# Phase 3.3-C — Dependency Coverage & Provenance Gate V1

**DRAFT / NOT LOCKED / NOT EXECUTABLE**

## Purpose
Fail closed when runtime dependency artifacts cannot be mapped 1:1 to checkpoint content references and verified from their original UTF-8 JSON bytes. No engine changes, replay, persistence writes, or restoration.

## API
`validateDependencyCoverage({ checkpoint, extension, contentBundle, bindings, provenance? })`

`bindings` must explicitly name each runtime dependency. In V1, manifest keys equal dependency names. The optional `lesson` dependency may be null only when `checkpoint.config.lessonId === null` and there is no lesson reference.

`contentBundle[dependency] = { id, version, bytes: Uint8Array }`, where bytes are **original artifact UTF-8 JSON bytes**. Hashing JSON reserialized after parsing is not equivalent to verifying original bytes. All reference keys must be consumed; no extra artifact is accepted.

## Scope and limits
- The module independently verifies SHA-256 of the supplied bytes and strict JSON parsing; it does **not** certify the schema/semantic suitability of individual dependency objects.
- It compares extension dependencyRefs to checkpoint contentRefs and session/revision, but does not replace the full snapshot extension validator's SHA-256 checkpoint binding check. Run that validator independently.
- The supplied bytes might be internally consistent but attacker-supplied. `provenanceVerified` always false, even if caller claims otherwise.
- Cross-store atomic capture, trusted source authenticity, and real restored-runtime behavioral equivalence remain unproven.
- Existing K283 fixture with zero hashes and without questionBanks ref is deliberately rejected.
- `executable` always false. This gate does not return hydrated runtime dependencies as an execution capability.
- Node ESM (`node:crypto`); no browser support claimed.

## Run
`node --test tests/unit/restoration/dependencyCoverageValidator.test.mjs`

## Next
Design a trusted capture + atomic persistence protocol for checkpoint, extension and raw dependency bytes. Then test a real restoration adapter; do not LOCK C3 yet.
