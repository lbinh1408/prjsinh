/** Phase 3.3-C / C1 — Session Restoration Contract V1 (no execution). */
export const RESTORATION_CONTRACT_INFO = Object.freeze({
    name: 'StudySessionRestorationContract', version: '1.0.0',
    phase: '3.3-C/C1', executable: false, synchronous: true
});

export const RESTORATION_ERROR_CODES = Object.freeze({
    INVALID_REQUEST: 'RESTORATION_INVALID_REQUEST',
    INVALID_CANDIDATE: 'RESTORATION_INVALID_CANDIDATE',
    UNSUPPORTED_RUNTIME: 'RESTORATION_UNSUPPORTED_RUNTIME',
    CONTENT_UNVERIFIED: 'RESTORATION_CONTENT_UNVERIFIED',
    ADAPTER_UNAVAILABLE: 'RESTORATION_ADAPTER_UNAVAILABLE',
    RESTORE_FAILED: 'RESTORATION_RESTORE_FAILED',
    POSTCONDITION_FAILED: 'RESTORATION_POSTCONDITION_FAILED'
});

const codes = new Set(Object.values(RESTORATION_ERROR_CODES));
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const nonempty = v => typeof v === 'string' && v.trim().length > 0;
const fail = (code, message) => { throw new RestorationError(code, message); };

export class RestorationError extends Error {
    constructor(code, message) {
        if (!codes.has(code)) throw new TypeError('Unknown restoration error code');
        if (!nonempty(message)) throw new TypeError('Restoration error message required');
        super(message);
        this.name = 'RestorationError';
        this.code = code;
        // Never echo caller data, adapter messages or answers into error details.
        this.details = {};
    }
}

/** Structural preflight only: does not claim integrity, atomicity, or continuity. */
export function validateRestorationCandidate(candidate) {
    const C = RESTORATION_ERROR_CODES;
    if (!record(candidate) || candidate.status !== 'ready-for-restoration' ||
        candidate.executable !== false || !nonempty(candidate.sessionId) ||
        !Number.isSafeInteger(candidate.revision) || candidate.revision < 0 ||
        !record(candidate.checkpoint) || !Array.isArray(candidate.attempts) ||
        !record(candidate.contentRefs) || !record(candidate.compatibility) ||
        !record(candidate.verification)) {
        fail(C.INVALID_CANDIDATE, 'Malformed restoration candidate.');
    }
    const v = candidate.verification;
    for (const k of ['checkpointValidated', 'attemptSequenceValidated',
        'attemptOwnershipValidated', 'contentReferencesMatched']) {
        if (v[k] !== true) fail(C.INVALID_CANDIDATE, 'Required hydration validation missing.');
    }
    for (const k of ['contentIntegrityVerified', 'atomicSnapshotGuaranteed',
        'runtimeContinuityVerified']) {
        if (v[k] !== false) fail(C.INVALID_CANDIDATE, 'Unexpected hydration guarantee flag.');
    }
    if (candidate.compatibility.runtimeName !== 'StudySession' ||
        candidate.compatibility.runtimeVersion !== '0.2.0' ||
        candidate.runtimeVersion !== '0.2.0') {
        fail(C.UNSUPPORTED_RUNTIME, 'Unsupported StudySession runtime.');
    }
    if (candidate.checkpoint.runtime?.sessionId !== candidate.sessionId ||
        candidate.checkpoint.runtime?.version !== candidate.runtimeVersion ||
        candidate.checkpoint.revision !== candidate.revision ||
        candidate.checkpoint.schemaVersion !== candidate.compatibility.checkpointSchemaVersion ||
        candidate.checkpoint.state?.schemaVersion !== candidate.compatibility.studentStateSchemaVersion) {
        fail(C.INVALID_CANDIDATE, 'Candidate and checkpoint metadata disagree.');
    }
    return true;
}

/** C1 request shape. Does NOT invoke adapter, mutate state, or restore a session. */
export function validateRestorationRequest(request) {
    const C = RESTORATION_ERROR_CODES;
    if (!record(request) || !own(request, 'candidate')) {
        fail(C.INVALID_REQUEST, 'Restoration request must include candidate.');
    }
    validateRestorationCandidate(request.candidate);
    // Content verification must be a separate, explicit gate in C2.
    // An arbitrary boolean from a caller is not proof of content integrity.
    if (!record(request.contentBundle)) {
        fail(C.INVALID_REQUEST, 'Content bundle is required for future verification.');
    }
    if (!record(request.adapter) || typeof request.adapter.restore !== 'function') {
        fail(C.ADAPTER_UNAVAILABLE, 'A supported restoration adapter is required.');
    }
    return true;
}

export function getRestorationContractInfo() {
    return { ...RESTORATION_CONTRACT_INFO, errorCodes: { ...RESTORATION_ERROR_CODES } };
}
