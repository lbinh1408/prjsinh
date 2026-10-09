/** Phase 3.3-C/C3 — guarded restoration; no mutation of LOCKED engines. */
import { RESTORATION_ERROR_CODES as C, RestorationError } from './restorationContract.js';
import { validateRestorationReadiness } from './restorationValidator.js';

const fail = (code, message) => { throw new RestorationError(code, message); };
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Adapter contract:
 * restore({candidate, contentBundle}) -> {
 *   session, snapshot, continuityProof: {
 *     sessionId, revision, runtimeVersion, exactState: true,
 *     attemptHistoryPreserved: true, noReplay: true, noWrites: true
 *   }
 * }
 *
 * This is a trust boundary. A proof object is an adapter assertion, NOT an
 * independent cryptographic or behavioral proof. Until a trusted StudySession
 * adapter is implemented and audited, the result MUST remain non-executable.
 */
export function restoreSession(request) {
    const readiness = validateRestorationReadiness(request);
    if (readiness.executable !== false || readiness.contentBytesVerified !== true) {
        fail(C.CONTENT_UNVERIFIED, 'Restoration preflight did not verify content bytes.');
    }
    // Copy before crossing adapter boundary: adapter must not mutate caller inputs.
    const candidateBefore = structuredClone(request.candidate);
    const contentBefore = Object.fromEntries(Object.entries(request.contentBundle).map(([k, v]) =>
        [k, { id: v.id, version: v.version, bytes: Uint8Array.from(v.bytes) }]));
    let result;
    try {
        result = request.adapter.restore({ candidate: structuredClone(candidateBefore), contentBundle: contentBefore });
    } catch (_) {
        fail(C.RESTORE_FAILED, 'Restoration adapter failed.');
    }
    if (result && typeof result.then === 'function') {
        fail(C.RESTORE_FAILED, 'Asynchronous restoration adapter is unsupported in V1.');
    }
    if (!same(request.candidate, candidateBefore)) {
        fail(C.POSTCONDITION_FAILED, 'Restoration mutated the candidate.');
    }
    if (!isRecord(result) || !isRecord(result.snapshot) || !isRecord(result.continuityProof) ||
        !isRecord(result.session)) {
        fail(C.POSTCONDITION_FAILED, 'Restoration result is incomplete.');
    }
    const p = result.continuityProof;
    if (p.sessionId !== candidateBefore.sessionId || p.revision !== candidateBefore.revision ||
        p.runtimeVersion !== candidateBefore.runtimeVersion || p.exactState !== true ||
        p.attemptHistoryPreserved !== true || p.noReplay !== true || p.noWrites !== true ||
        result.snapshot.sessionId !== candidateBefore.sessionId) {
        fail(C.POSTCONDITION_FAILED, 'Restoration continuity assertions failed.');
    }
    // A caller-controlled proof is insufficient to grant an executable capability.
    // The session is intentionally NOT returned until a separately audited adapter exists.
    return Object.freeze({
        status: 'adapter-restoration-unverified',
        executable: false,
        sessionId: candidateBefore.sessionId,
        revision: candidateBefore.revision,
        contentBytesVerified: true,
        runtimeContinuityVerified: false,
        adapterCapabilityVerified: false,
        atomicSnapshotGuaranteed: false
    });
}
