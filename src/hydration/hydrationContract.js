
/**
 * Phase 3.3-B — Hydration Contract V1.
 * Pure metadata, request validation and typed errors.
 * Does not read stores or execute a StudySession.
 */
export const HYDRATION_CONTRACT_INFO = Object.freeze({
    name: 'StudySessionHydrationContract',
    version: '1.0.0',
    executable: false,
    synchronous: true
});

export const HYDRATION_COMPATIBILITY = Object.freeze({
    checkpointSchemaVersions: Object.freeze(['1.0.0-draft']),
    runtime: Object.freeze({
        name: 'StudySession',
        versions: Object.freeze(['0.2.0'])
    }),
    studentStateSchemaVersions: Object.freeze(['1.2.0'])
});

export const HYDRATION_ERROR_CODES = Object.freeze({
    INVALID_REQUEST: 'HYDRATION_INVALID_REQUEST',
    CHECKPOINT_NOT_FOUND: 'HYDRATION_CHECKPOINT_NOT_FOUND',
    SESSION_MISMATCH: 'HYDRATION_SESSION_MISMATCH',
    INVALID_CHECKPOINT: 'HYDRATION_INVALID_CHECKPOINT',
    REVISION_MISMATCH: 'HYDRATION_REVISION_MISMATCH',
    ATTEMPT_SEQUENCE_MISMATCH: 'HYDRATION_ATTEMPT_SEQUENCE_MISMATCH',
    ATTEMPT_PAYLOAD_MISMATCH: 'HYDRATION_ATTEMPT_PAYLOAD_MISMATCH',
    CONTENT_MISMATCH: 'HYDRATION_CONTENT_MISMATCH',
    UNSUPPORTED_VERSION: 'HYDRATION_UNSUPPORTED_VERSION',
    INCOMPLETE_STATE: 'HYDRATION_INCOMPLETE_STATE',
    READ_FAILED: 'HYDRATION_READ_FAILED',
    PLAN_INVALID: 'HYDRATION_PLAN_INVALID'
});

const KNOWN_CODES = new Set(Object.values(HYDRATION_ERROR_CODES));
const isRecord = value => value !== null && typeof value === 'object' &&
    !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export class HydrationError extends Error {
    constructor(code, message, details = {}) {
        if (!KNOWN_CODES.has(code)) throw new TypeError('Unknown hydration error code');
        if (typeof message !== 'string' || !message) throw new TypeError('Hydration error message is required');
        if (!isRecord(details)) throw new TypeError('Hydration error details must be an object');
        super(message);
        this.name = 'HydrationError';
        this.code = code;
        this.details = { ...details };
    }
}

function invalidRequest(message) {
    return new HydrationError(HYDRATION_ERROR_CODES.INVALID_REQUEST, message);
}

function validateRefs(refs) {
    if (!isRecord(refs) || Object.keys(refs).length === 0) {
        throw invalidRequest('expectedContentRefs must be a nonempty reference manifest.');
    }
    for (const ref of Object.values(refs)) {
        if (!isRecord(ref) ||
            !['id', 'version'].every(key => hasOwn(ref, key) &&
                typeof ref[key] === 'string' && ref[key].trim().length > 0) ||
            typeof ref.sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(ref.sha256)) {
            throw invalidRequest('expectedContentRefs contains an invalid content reference.');
        }
    }
}

/** Validate the synchronous public input boundary without reading stores. */
export function validateHydrationRequest(request) {
    if (!isRecord(request)) throw invalidRequest('Hydration request must be an object.');
    const { sessionId, expectedContentRefs, checkpointStore, attemptStore } = request;
    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        throw invalidRequest('sessionId must be a nonempty string.');
    }
    validateRefs(expectedContentRefs);
    if (!checkpointStore ||
        typeof checkpointStore.getCheckpoint !== 'function' ||
        typeof checkpointStore.getRevision !== 'function') {
        throw invalidRequest('checkpointStore must implement getCheckpoint and getRevision.');
    }
    if (!attemptStore ||
        typeof attemptStore.listAttemptIds !== 'function' ||
        typeof attemptStore.getAttempt !== 'function') {
        throw invalidRequest('attemptStore must implement listAttemptIds and getAttempt.');
    }
    return true;
}

export function getHydrationContractInfo() {
    return {
        ...HYDRATION_CONTRACT_INFO,
        compatibility: {
            checkpointSchemaVersions: [...HYDRATION_COMPATIBILITY.checkpointSchemaVersions],
            runtime: {
                name: HYDRATION_COMPATIBILITY.runtime.name,
                versions: [...HYDRATION_COMPATIBILITY.runtime.versions]
            },
            studentStateSchemaVersions: [...HYDRATION_COMPATIBILITY.studentStateSchemaVersions]
        },
        errorCodes: { ...HYDRATION_ERROR_CODES }
    };
}
