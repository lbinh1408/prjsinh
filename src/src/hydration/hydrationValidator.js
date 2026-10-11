
/** Phase 3.3-B — semantic validation of a read-only hydration snapshot. */
import { validateCheckpoint } from '../persistence/checkpointCodec.js';
import {
    HydrationError, HYDRATION_ERROR_CODES as C,
    HYDRATION_COMPATIBILITY as POLICY
} from './hydrationContract.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const safePositive = x => Number.isSafeInteger(x) && x > 0;
const fail = (code, message) => { throw new HydrationError(code, message); };
const equalSequence = (a, b) => Array.isArray(a) && Array.isArray(b) &&
    a.length === b.length && a.every((x, i) => x === b[i]);

function checkRefs(actual, expected) {
    if (!record(actual) || !record(expected)) return false;
    const a = Object.keys(actual).sort();
    const b = Object.keys(expected).sort();
    if (!equalSequence(a, b)) return false;
    return a.every(key => {
        const x = actual[key], y = expected[key];
        return record(x) && record(y) && x.id === y.id &&
            x.version === y.version && typeof x.sha256 === 'string' &&
            typeof y.sha256 === 'string' &&
            x.sha256.toLowerCase() === y.sha256.toLowerCase();
    });
}

function complete(checkpoint, sessionId) {
    const { runtime, config, state, currentDecision, lessonRuntime, masteryRuntime, history } = checkpoint;
    if (!nonempty(runtime.status) || !nonempty(runtime.startedAt) ||
        !nonempty(runtime.lastActivityAt)) return false;
    if (!record(config) || !safePositive(config.historyLimit) ||
        !['learningMode', 'timeBudget', 'clusterId', 'lessonId', 'contextId']
            .every(key => own(config, key))) return false;
    if (!record(state) || !record(state.learning) || !record(state.knowledge)) return false;
    if (state.learning.session !== undefined &&
        (!record(state.learning.session) ||
            state.learning.session.sessionId !== sessionId)) return false;
    if (!record(currentDecision) || !nonempty(currentDecision.action)) return false;
    if (!record(lessonRuntime) ||
        !(lessonRuntime.currentItem === null || record(lessonRuntime.currentItem)) ||
        !record(lessonRuntime.progress)) return false;
    const { completedSectionIds: done, skippedSectionIds: skipped } = lessonRuntime.progress;
    const validIds = arr => Array.isArray(arr) && arr.every(nonempty) &&
        new Set(arr).size === arr.length;
    if (!validIds(done) || !validIds(skipped) ||
        done.some(id => skipped.includes(id))) return false;
    if (!record(masteryRuntime) || !record(masteryRuntime.evidenceHistoryByNode)) return false;
    if (!Array.isArray(history) || history.length > config.historyLimit) return false;
    return true;
}

/**
 * @param {object} snapshot Output of readHydrationSnapshot().
 * @param {object} options { sessionId, expectedContentRefs }.
 * @returns {true} If all V1 hydration gates pass.
 * @throws {HydrationError} Typed fail-closed rejection.
 *
 * No store access, mutations, engine execution, or attempt replay.
 */
export function validateHydrationSnapshot(snapshot, options) {
    if (!record(snapshot) || !record(options) || !nonempty(options.sessionId) ||
        !record(options.expectedContentRefs)) {
        fail(C.INVALID_REQUEST, 'Invalid hydration validation inputs.');
    }
    const { checkpoint, attempts, attemptIds, revision, sessionId } = snapshot;
    if (!record(checkpoint)) fail(C.INVALID_CHECKPOINT, 'Checkpoint is not an object.');
    // Distinguish unsupported schema version from otherwise malformed checkpoints.
    if (typeof checkpoint.schemaVersion === 'string' &&
        !POLICY.checkpointSchemaVersions.includes(checkpoint.schemaVersion)) {
        fail(C.UNSUPPORTED_VERSION, 'Unsupported checkpoint schema version.');
    }
    try { validateCheckpoint(checkpoint); }
    catch { fail(C.INVALID_CHECKPOINT, 'Checkpoint codec validation failed.'); }

    if (sessionId !== options.sessionId || checkpoint.runtime.sessionId !== options.sessionId) {
        fail(C.SESSION_MISMATCH, 'Checkpoint/session identity mismatch.');
    }
    if (!Number.isSafeInteger(revision) || revision < 1 || checkpoint.revision !== revision) {
        fail(C.REVISION_MISMATCH, 'Checkpoint revision mismatch.');
    }
    if (!equalSequence(checkpoint.attemptIds, attemptIds)) {
        fail(C.ATTEMPT_SEQUENCE_MISMATCH, 'Checkpoint/store attempt order differs.');
    }
    if (!Array.isArray(attempts) || attempts.length !== attemptIds.length ||
        attempts.some((attempt, i) => !record(attempt) ||
            attempt.attemptId !== attemptIds[i] ||
            (own(attempt, 'sessionId') && attempt.sessionId !== options.sessionId))) {
        fail(C.ATTEMPT_PAYLOAD_MISMATCH, 'Attempt payload identity mismatch.');
    }
    if (!checkRefs(checkpoint.contentRefs, options.expectedContentRefs)) {
        fail(C.CONTENT_MISMATCH, 'Content reference manifest mismatch.');
    }
    if (checkpoint.runtime.name !== POLICY.runtime.name ||
        !POLICY.runtime.versions.includes(checkpoint.runtime.version) ||
        !POLICY.studentStateSchemaVersions.includes(checkpoint.state.schemaVersion)) {
        fail(C.UNSUPPORTED_VERSION, 'Unsupported runtime or StudentState version.');
    }
    if (!complete(checkpoint, options.sessionId)) {
        fail(C.INCOMPLETE_STATE, 'Incomplete restoration state projection.');
    }
    return true;
}
