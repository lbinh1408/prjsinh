# Phase 3.3-C / C2 — Restoration Validator V1

Status: **DRAFT — NOT LOCKED**. Does not restore sessions.

## Request
Uses C1 `validateRestorationRequest({candidate, contentBundle, adapter})` unchanged.
`contentBundle` maps each `candidate.contentRefs` key to `{id, version, bytes: Uint8Array}`.
Bytes must be **the exact raw bytes of the trusted content artifact**, not reconstructed JSON or a caller-asserted digest. SHA-256 computed using Node built-in crypto. All manifest entries are mandatory; extra entries rejected. Placeholder all-zero SHA-256 rejected.

## Output
`validateRestorationReadiness(request)` returns a frozen non-executable report. `contentBytesVerified` means only *the supplied bytes match candidate SHA*, not that their origin is trusted. Adapter capability, cross-store atomicity and runtime continuity remain **unverified**. No StudySession execution, replay, persistence writes or cleanup.

## Gate to C3
Need a trusted artifact loader/provenance boundary and an independently reviewed restoration adapter capable of reconstructing all StudySession V0.2.0 internals without editing LOCKED modules. C2 only validates selected runtime metadata, **not** complete state continuity. K283 fixture's all-zero hashes cannot pass this gate until real content bytes and matching hashes exist. Never silently bypass this check.

## Usage
`node --test tests/unit/restoration/restorationContract.test.mjs tests/unit/restoration/restorationValidator.test.mjs`
