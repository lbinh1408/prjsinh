# Phase 3.3-C/C3 — Guarded Session Restorer V1

Status: PROVISIONAL — NOT LOCKED. This module is a non-executable adapter integration probe, not a resumable StudySession.

## Contract
- Uses C2 `validateRestorationReadiness` to verify supplied content bytes.
- Calls the adapter once only after validation.
- Does not modify locked StudySession, Persistence, Mastery or Hydration code.
- Sanitizes adapter errors and refuses Promise-returning adapters.
- Validates metadata assertions, but DOES NOT independently prove internal runtime continuity.
- Never returns the adapter session or executable capability.

## Why C3 is not complete
StudySession V0.2.0 has no public snapshot-import API. A caller-supplied `continuityProof` is not trustworthy proof of replay-free state restoration. To unlock executable restoration, define and independently test a trusted adapter boundary, including exact internal state reconstruction, no write/replay side effects, and behavioral equivalence after resume. Do not change the LOCKED module without explicit versioning.

## Install
Copy `src/restoration/sessionRestorer.js` into your repository next to C1 and C2 modules. Test with actual C1/C2 and your adapter fixture. Do not use this module to resume a live session yet.
