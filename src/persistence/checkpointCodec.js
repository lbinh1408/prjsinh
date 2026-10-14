
/**
 * Phase 3.2 — Checkpoint Codec V1 (DRAFT, NOT LOCKED)
 * Pure JSON-safe projection; NOT a StudySession hydration API.
 * No dependency on locked production engines.
 */

export const CHECKPOINT_CODEC_INFO = Object.freeze({
    name: 'StudySessionCheckpointCodec',
    version: '1.0.0-draft',
    supportsHydration: false,
    supportsPersistence: false
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const REMEDIATION_GENERATION_STOP_VERSION = '1.0.0';
const REMEDIATION_GENERATION_STOP_FIELDS = [
    'schemaVersion',
    'status',
    'reasonCode',
    'triggerAttemptId',
    'targetNodeId',
    'bankId',
    'bankVersion',
    'configFingerprint'
];
const REMEDIATION_POLICY_ERROR_STOP_VERSION = '1.0.0';
const REMEDIATION_POLICY_ERROR_STOP_FIELDS = [
    'schemaVersion',
    'status',
    'reasonCode',
    'triggerAttemptId',
    'targetNodeId',
    'bankId',
    'bankVersion',
    'policyId',
    'policyVersion',
    'configFingerprint'
];

function fail(message) {
    throw new TypeError(`Invalid checkpoint: ${message}`);
}

function requireFields(object, fields, path) {
    if (!isRecord(object)) fail(`${path} must be an object`);
    for (const field of fields) {
        if (!hasOwn(object, field) || object[field] === undefined) {
            fail(`${path}.${field} is required`);
        }
    }
}

function jsonCopy(value, label) {
    if (value === undefined) fail(`${label} must not be undefined`);
    let json;
    try {
        json = JSON.stringify(value);
    } catch (error) {
        fail(`${label} is not JSON-serializable: ${error.message}`);
    }
    if (typeof json !== 'string') fail(`${label} is not JSON-serializable`);
    const decoded = JSON.parse(json);
    // Prevent silently losing undefined properties, NaN, Infinity, Dates,
    // functions, symbols and sparse array elements during serialization.
    if (!jsonEquivalent(value, decoded)) fail(`${label} loses information during JSON serialization`);
    return decoded;
}


function jsonEquivalent(a, b) {
    if (a === b) return true;

    if (
        a === null ||
        b === null ||
        typeof a !== typeof b
    ) {
        return false;
    }

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; i++) {
            if (!hasOwn(a, i) || !hasOwn(b, i)) {
                return false;
            }

            if (!jsonEquivalent(a[i], b[i])) {
                return false;
            }
        }

        return true;
    }

    if (!isRecord(a) || !isRecord(b)) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
        return false;
    }

    for (const key of keysA) {
        if (!hasOwn(b, key)) {
            return false;
        }

        if (!jsonEquivalent(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

function validateContentRefs(refs) {
    if (!isRecord(refs) || Object.keys(refs).length === 0) {
        fail('contentRefs must be a nonempty object of versioned content references');
    }
    for (const [name, ref] of Object.entries(refs)) {
        requireFields(ref, ['id', 'version', 'sha256'], `contentRefs.${name}`);
        if (typeof ref.id !== 'string' || !ref.id.trim() ||
            typeof ref.version !== 'string' || !ref.version.trim() ||
            typeof ref.sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(ref.sha256)) {
            fail(`contentRefs.${name} requires id, version and 64-character SHA-256 hex`);
        }
    }
}

function validateRemediationGenerationStop(stop) {
    requireFields(
        stop,
        REMEDIATION_GENERATION_STOP_FIELDS,
        'extensions.remediationGenerationStop'
    );
    if (Object.keys(stop).some(
        field => !REMEDIATION_GENERATION_STOP_FIELDS.includes(field)
    )) {
        fail('extensions.remediationGenerationStop contains unsupported fields');
    }
    if (stop.schemaVersion !== REMEDIATION_GENERATION_STOP_VERSION) {
        fail('extensions.remediationGenerationStop has unsupported schemaVersion');
    }
    if (stop.status !== 'INFEASIBLE') {
        fail('extensions.remediationGenerationStop.status must be INFEASIBLE');
    }
    for (const field of [
        'reasonCode',
        'triggerAttemptId',
        'targetNodeId',
        'bankId',
        'bankVersion'
    ]) {
        if (typeof stop[field] !== 'string' || !stop[field].trim()) {
            fail(`extensions.remediationGenerationStop.${field} must be a nonempty string`);
        }
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(stop.reasonCode)) {
        fail('extensions.remediationGenerationStop.reasonCode must be a stable code');
    }
    if (
        typeof stop.configFingerprint !== 'string' ||
        !/^[a-fA-F0-9]{64}$/.test(stop.configFingerprint)
    ) {
        fail('extensions.remediationGenerationStop.configFingerprint must be a 64-character SHA-256 hex digest');
    }
}

function validateRemediationPolicyErrorStop(stop) {
    requireFields(
        stop,
        REMEDIATION_POLICY_ERROR_STOP_FIELDS,
        'extensions.remediationPolicyErrorStop'
    );
    if (Object.keys(stop).some(
        field => !REMEDIATION_POLICY_ERROR_STOP_FIELDS.includes(field)
    )) {
        fail('extensions.remediationPolicyErrorStop contains unsupported fields');
    }
    if (stop.schemaVersion !== REMEDIATION_POLICY_ERROR_STOP_VERSION) {
        fail('extensions.remediationPolicyErrorStop has unsupported schemaVersion');
    }
    if (stop.status !== 'POLICY_ERROR') {
        fail('extensions.remediationPolicyErrorStop.status must be POLICY_ERROR');
    }
    for (const field of [
        'reasonCode',
        'triggerAttemptId',
        'targetNodeId',
        'bankId',
        'bankVersion',
        'policyId',
        'policyVersion'
    ]) {
        if (typeof stop[field] !== 'string' || !stop[field].trim()) {
            fail(`extensions.remediationPolicyErrorStop.${field} must be a nonempty string`);
        }
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(stop.reasonCode)) {
        fail('extensions.remediationPolicyErrorStop.reasonCode must be a stable code');
    }
    if (
        typeof stop.configFingerprint !== 'string' ||
        !/^[a-fA-F0-9]{64}$/.test(stop.configFingerprint)
    ) {
        fail('extensions.remediationPolicyErrorStop.configFingerprint must be a 64-character SHA-256 hex digest');
    }
}

function validateExtensions(extensions, checkpoint) {
    if (!isRecord(extensions)) {
        fail('extensions must be an object');
    }
    if (
        hasOwn(extensions, 'remediationGenerationStop') &&
        hasOwn(extensions, 'remediationPolicyErrorStop')
    ) {
        fail('extensions cannot contain both remediationGenerationStop and remediationPolicyErrorStop');
    }
    if (hasOwn(extensions, 'remediationGenerationStop')) {
        validateRemediationGenerationStop(
            extensions.remediationGenerationStop
        );
    }
    if (hasOwn(extensions, 'remediationPolicyErrorStop')) {
        validateRemediationPolicyErrorStop(
            extensions.remediationPolicyErrorStop
        );
        if (checkpoint.currentSelection !== null || checkpoint.currentQuestion !== null) {
            fail('extensions.remediationPolicyErrorStop requires currentSelection and currentQuestion to be null');
        }
    }
}

export function validateCheckpoint(checkpoint) {
    requireFields(checkpoint, [
        'schemaVersion', 'revision', 'savedAt', 'runtime', 'config',
        'contentRefs', 'state', 'currentDecision', 'currentSelection',
        'currentQuestion', 'lessonRuntime', 'activeRemediationPlan',
        'history', 'masteryRuntime', 'attemptIds'
    ], 'checkpoint');
    if (checkpoint.schemaVersion !== CHECKPOINT_CODEC_INFO.version) fail('unsupported schemaVersion');
    if (!Number.isSafeInteger(checkpoint.revision) || checkpoint.revision < 0) fail('revision must be a nonnegative safe integer');
    if (typeof checkpoint.savedAt !== 'string' || !Number.isFinite(Date.parse(checkpoint.savedAt))) fail('savedAt must be a timestamp');
    requireFields(checkpoint.runtime, ['name', 'version', 'sessionId', 'startedAt', 'lastActivityAt', 'status'], 'runtime');
    if (typeof checkpoint.runtime.sessionId !== 'string' || !checkpoint.runtime.sessionId.trim()) fail('runtime.sessionId is required');
    if (!isRecord(checkpoint.config)) fail('config must be an object');
    validateContentRefs(checkpoint.contentRefs);
    if (!isRecord(checkpoint.state)) fail('state must be an object');
    if (!isRecord(checkpoint.currentDecision)) fail('currentDecision must be an object');
    if (!isRecord(checkpoint.lessonRuntime)) fail('lessonRuntime must be an object');
    requireFields(checkpoint.lessonRuntime, ['currentItem', 'progress'], 'lessonRuntime');
    requireFields(checkpoint.lessonRuntime.progress, ['completedSectionIds', 'skippedSectionIds'], 'lessonRuntime.progress');
    for (const key of ['completedSectionIds', 'skippedSectionIds']) {
        if (!Array.isArray(checkpoint.lessonRuntime.progress[key]) ||
            !checkpoint.lessonRuntime.progress[key].every(v => typeof v === 'string')) {
            fail(`lessonRuntime.progress.${key} must be a string array`);
        }
    }
    if (!Array.isArray(checkpoint.history)) fail('history must be an array');
    requireFields(checkpoint.masteryRuntime, ['evidenceHistoryByNode'], 'masteryRuntime');
    if (!isRecord(checkpoint.masteryRuntime.evidenceHistoryByNode)) fail('masteryRuntime.evidenceHistoryByNode must be an object');
    if (!Array.isArray(checkpoint.attemptIds) ||
        !checkpoint.attemptIds.every(id => typeof id === 'string' && id.length > 0) ||
        new Set(checkpoint.attemptIds).size !== checkpoint.attemptIds.length) {
        fail('attemptIds must be unique nonempty strings');
    }
    if (hasOwn(checkpoint, 'extensions')) {
        validateExtensions(checkpoint.extensions, checkpoint);
    }
    if (hasOwn(checkpoint, 'dependencies') || hasOwn(checkpoint, 'lastFlowResult') ||
        hasOwn(checkpoint.lessonRuntime, 'plan') || hasOwn(checkpoint, 'attempts')) {
        fail('checkpoint contains excluded runtime data');
    }
    jsonCopy(checkpoint, 'checkpoint');
    return true;
}

/**
 * @param {object} options
 * @param {object} options.session - StudySession or getSessionSnapshot() result
 * @param {object} options.contentRefs - {key:{id,version,sha256}}
 * @param {number} options.revision - Durable checkpoint revision
 * @param {string} options.savedAt - ISO timestamp supplied by caller
 * @param {string[]} options.persistedAttemptIds - IDs confirmed durable by Attempt store
 */
export function encodeCheckpoint({
    session,
    contentRefs,
    revision,
    savedAt,
    persistedAttemptIds = [],
    extensions = session?.extensions
}) {
    requireFields(session, [
        'runtime', 'config', 'state', 'currentDecision', 'currentSelection',
        'currentQuestion', 'lessonRuntime', 'activeRemediationPlan',
        'attempts', 'history', 'masteryRuntime'
    ], 'session');
    requireFields(session.lessonRuntime, ['currentItem', 'progress'], 'session.lessonRuntime');
    if (!Array.isArray(session.attempts)) fail('session.attempts must be an array');
    const attemptIds = session.attempts.map((attempt, index) => {
        if (!isRecord(attempt) || typeof attempt.attemptId !== 'string' || !attempt.attemptId) {
            fail(`session.attempts[${index}].attemptId is required`);
        }
        return attempt.attemptId;
    });
    if (!Array.isArray(persistedAttemptIds) ||
        attemptIds.length !== persistedAttemptIds.length ||
        attemptIds.some((id, i) => id !== persistedAttemptIds[i])) {
        fail('attempts must be durably persisted in order before checkpoint encoding');
    }
    const checkpoint = {
        schemaVersion: CHECKPOINT_CODEC_INFO.version,
        revision,
        savedAt,
        runtime: session.runtime,
        config: session.config,
        contentRefs,
        state: session.state,
        currentDecision: session.currentDecision,
        currentSelection: session.currentSelection,
        currentQuestion: session.currentQuestion,
        lessonRuntime: {
            currentItem: session.lessonRuntime.currentItem,
            progress: session.lessonRuntime.progress
        },
        activeRemediationPlan: session.activeRemediationPlan,
        history: session.history,
        masteryRuntime: session.masteryRuntime,
        attemptIds
    };
    if (extensions !== undefined) {
        checkpoint.extensions = extensions;
    }
    validateCheckpoint(checkpoint);
    return jsonCopy(checkpoint, 'checkpoint');
}

/** Decode JSON text or an object; never hydrates a runnable StudySession. */
export function decodeCheckpoint(input) {
    let value = input;
    if (typeof input === 'string') {
        try {
            value = JSON.parse(input);
        } catch (error) {
            fail(`malformed JSON: ${error.message}`);
        }
    }
    validateCheckpoint(value);
    return jsonCopy(value, 'checkpoint');
}

export function getCheckpointCodecInfo() {
    return { ...CHECKPOINT_CODEC_INFO };
}
