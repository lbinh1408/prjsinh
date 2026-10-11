
/**
 * Phase 3.3-B — Hydration Reader V1
 *
 * Read-only access to locked Persistence V1 stores.
 *
 * Does not:
 * - validate checkpoint business semantics
 * - compare trusted content references
 * - run StudySession or learning engines
 * - mutate either store
 * - guarantee an atomic cross-store snapshot
 */

import {
    HydrationError,
    HYDRATION_ERROR_CODES as CODES,
    validateHydrationRequest
} from './hydrationContract.js';

const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);

function fail(code, message, details = {}) {
    throw new HydrationError(code, message, details);
}

function isRecord(value) {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value);
}

function sameIds(left, right) {
    return Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((id, index) => id === right[index]);
}

/**
 * Make an independent JSON copy without silently discarding
 * unsupported values.
 */
function detachedJson(value) {
    const seen = new Set();

    function visit(item) {
        if (item === null ||
            typeof item === 'string' ||
            typeof item === 'boolean') {
            return;
        }

        if (typeof item === 'number') {
            if (!Number.isFinite(item)) {
                throw new TypeError('Non-finite JSON number');
            }
            return;
        }

        if (typeof item !== 'object') {
            throw new TypeError('Unsupported JSON value');
        }

        if (seen.has(item)) {
            throw new TypeError('Circular JSON structure');
        }

        const proto = Object.getPrototypeOf(item);
        if (!Array.isArray(item) &&
            proto !== Object.prototype &&
            proto !== null) {
            throw new TypeError('Non-plain JSON object');
        }

        seen.add(item);

        try {
            if (Array.isArray(item)) {
                if (Object.keys(item).length !== item.length) {
                    throw new TypeError('Invalid JSON array');
                }

                for (let i = 0; i < item.length; i++) {
                    if (!hasOwn(item, i)) {
                        throw new TypeError('Sparse JSON array');
                    }
                    visit(item[i]);
                }
            } else {
                for (const key of Object.keys(item)) {
                    visit(item[key]);
                }
            }

            if (Object.getOwnPropertySymbols(item).length) {
                throw new TypeError('Symbol-keyed JSON object');
            }
        } finally {
            seen.delete(item);
        }
    }

    visit(value);
    return JSON.parse(JSON.stringify(value));
}

function readRevision(store, sessionId) {
    const revision = store.getRevision({ sessionId });

    if (!Number.isSafeInteger(revision) || revision < 0) {
        fail(
            CODES.READ_FAILED,
            'CheckpointStore returned an invalid revision.'
        );
    }

    return revision;
}

function readIds(store, sessionId) {
    const ids = store.listAttemptIds({ sessionId });

    if (!Array.isArray(ids) ||
        ids.some(id =>
            typeof id !== 'string' ||
            id.trim().length === 0
        ) ||
        new Set(ids).size !== ids.length) {
        fail(
            CODES.READ_FAILED,
            'AttemptStore returned an invalid attempt ID sequence.'
        );
    }

    return detachedJson(ids);
}

function sameJson(left, right) {
    // Canonical comparison ignores object property insertion order.
    function canonical(value) {
        if (Array.isArray(value)) {
            return value.map(canonical);
        }

        if (isRecord(value)) {
            const result = {};

            for (const key of Object.keys(value).sort()) {
                Object.defineProperty(result, key, {
                    value: canonical(value[key]),
                    enumerable: true,
                    writable: true,
                    configurable: true
                });
            }

            return result;
        }

        return value;
    }

    return JSON.stringify(canonical(left)) ===
        JSON.stringify(canonical(right));
}

/**
 * Read a candidate snapshot using two observation passes.
 *
 * Request is the same object validated by
 * validateHydrationRequest().
 *
 * The reader checks observational consistency only.
 * Full semantic validation belongs to HydrationValidator.
 */
export function readHydrationSnapshot(request) {
    validateHydrationRequest(request);

    const {
        sessionId,
        checkpointStore,
        attemptStore
    } = request;

    try {
        // First observation pass.
        const revisionBefore = readRevision(
            checkpointStore,
            sessionId
        );

        const checkpointBefore =
            checkpointStore.getCheckpoint({ sessionId });

        if (checkpointBefore === null) {
            fail(
                CODES.CHECKPOINT_NOT_FOUND,
                'No checkpoint exists for the requested session.'
            );
        }

        if (!isRecord(checkpointBefore)) {
            fail(
                CODES.INVALID_CHECKPOINT,
                'CheckpointStore returned an invalid checkpoint object.'
            );
        }

        const checkpoint = detachedJson(checkpointBefore);

        const attemptIds = readIds(attemptStore, sessionId);

        const attempts = [];

        for (const attemptId of attemptIds) {
            const attempt = attemptStore.getAttempt({
                sessionId,
                attemptId
            });

            if (attempt === null) {
                fail(
                    CODES.ATTEMPT_PAYLOAD_MISMATCH,
                    'A listed attempt could not be loaded.',
                    { attemptId }
                );
            }

            if (!isRecord(attempt)) {
                fail(
                    CODES.ATTEMPT_PAYLOAD_MISMATCH,
                    'AttemptStore returned an invalid attempt payload.',
                    { attemptId }
                );
            }

            attempts.push(detachedJson(attempt));
        }

        // Second observation pass.
        const revisionAfter = readRevision(
            checkpointStore,
            sessionId
        );

        const checkpointAfter =
            checkpointStore.getCheckpoint({ sessionId });

        const idsAfter = readIds(attemptStore, sessionId);

        if (revisionBefore !== revisionAfter ||
            !sameJson(checkpoint, checkpointAfter)) {
            fail(
                CODES.REVISION_MISMATCH,
                'Checkpoint changed during hydration read.'
            );
        }

        if (!sameIds(attemptIds, idsAfter)) {
            fail(
                CODES.ATTEMPT_SEQUENCE_MISMATCH,
                'Attempt sequence changed during hydration read.'
            );
        }

        if (checkpoint.revision !== revisionBefore) {
            fail(
                CODES.REVISION_MISMATCH,
                'Checkpoint revision does not match store revision.'
            );
        }

        return {
            sessionId,
            revision: revisionBefore,
            checkpoint,
            attemptIds,
            attempts
        };
    } catch (error) {
        if (error instanceof HydrationError) {
            throw error;
        }

        throw new HydrationError(
            CODES.READ_FAILED,
            'Hydration store read failed.',
            // Do not copy arbitrary adapter-controlled error.code.
            // It may contain student answers, tokens or other secrets.
            {}
        );
    }
}
