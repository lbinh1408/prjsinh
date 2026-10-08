
/**
 * ============================================================
 * persistenceCoordinator.js
 * ============================================================
 *
 * Phase 3.2 — Persistence Coordinator V1
 *
 * Status: DRAFT — NOT LOCKED
 *
 * Coordinates:
 *
 *   StudySession
 *       |
 *       v
 *   PersistenceCoordinator
 *       |
 *       +--> AttemptStore
 *       |
 *       +--> CheckpointCodec
 *       |
 *       +--> CheckpointStore
 *
 * WRITE ORDER:
 *
 * 1. Validate request
 * 2. Preflight checkpoint revision
 * 3. Verify existing attempt prefix
 * 4. Append missing attempts
 * 5. Verify complete attempt sequence
 * 6. Encode checkpoint
 * 7. Save checkpoint using CAS
 *
 * IMPORTANT:
 *
 * This coordinator does NOT provide a transaction
 * across AttemptStore and CheckpointStore.
 *
 * A failure after attempt append may leave attempts
 * stored without a corresponding checkpoint.
 *
 * Such failures are reported explicitly.
 *
 * ============================================================
 */

import {
    encodeCheckpoint
} from './checkpointCodec.js';

/**
 * ============================================================
 * CAPABILITIES
 * ============================================================
 */

export const PERSISTENCE_COORDINATOR_INFO = Object.freeze({
    name: 'PersistenceCoordinator',
    version: '1.0.0-draft',

    storage: 'delegated',

    durable: false,
    supportsTransactions: false,
    supportsAtomicCommit: false,

    supportsCAS: true,
    supportsIdempotency: true,

    supportsHydration: false,
    supportsResume: false,

    writeOrder: Object.freeze([
        'attempts',
        'checkpoint'
    ])
});

/**
 * ============================================================
 * INTERNAL HELPERS
 * ============================================================
 */

function isRecord(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
    );
}

function assertNonemptyString(value, name) {
    if (
        typeof value !== 'string' ||
        value.trim().length === 0
    ) {
        throw new TypeError(
            `${name} must be a nonempty string`
        );
    }
}

function assertRevision(value, name) {
    if (
        !Number.isSafeInteger(value) ||
        value < 0
    ) {
        throw new TypeError(
            `${name} must be a nonnegative safe integer`
        );
    }
}

function makeError(code, message, details = {}) {
    const error = new Error(message);

    error.code = code;
    error.details = details;

    return error;
}

function cloneJson(value) {
    return JSON.parse(
        JSON.stringify(value)
    );
}

function assertStoreMethods(
    store,
    name,
    methods
) {
    if (!isRecord(store)) {
        throw new TypeError(
            `${name} must be an object`
        );
    }

    for (const method of methods) {
        if (typeof store[method] !== 'function') {
            throw new TypeError(
                `${name}.${method} must be a function`
            );
        }
    }
}

function assertSession(session) {
    if (!isRecord(session)) {
        throw new TypeError(
            'session must be an object'
        );
    }

    if (!isRecord(session.runtime)) {
        throw new TypeError(
            'session.runtime must be an object'
        );
    }

    assertNonemptyString(
        session.runtime.sessionId,
        'session.runtime.sessionId'
    );

    if (!Array.isArray(session.attempts)) {
        throw new TypeError(
            'session.attempts must be an array'
        );
    }

    const seen = new Set();

    for (const attempt of session.attempts) {
        if (!isRecord(attempt)) {
            throw new TypeError(
                'Each attempt must be an object'
            );
        }

        assertNonemptyString(
            attempt.attemptId,
            'attempt.attemptId'
        );

        if (seen.has(attempt.attemptId)) {
            throw makeError(
                'PERSISTENCE_DUPLICATE_ATTEMPT',
                `Duplicate attemptId: ${attempt.attemptId}`
            );
        }

        seen.add(attempt.attemptId);

        if (
            Object.hasOwn(attempt, 'sessionId') &&
            attempt.sessionId !==
            session.runtime.sessionId
        ) {
            throw makeError(
                'PERSISTENCE_SESSION_CONFLICT',
                'Attempt sessionId does not match session'
            );
        }
    }
}

function assertRequest({
    session,
    contentRefs,
    revision,
    expectedRevision,
    savedAt
}) {
    assertSession(session);

    if (!isRecord(contentRefs)) {
        throw new TypeError(
            'contentRefs must be an object'
        );
    }

    assertRevision(revision, 'revision');

    assertRevision(
        expectedRevision,
        'expectedRevision'
    );

    if (revision < 1) {
        throw new TypeError(
            'revision must be at least 1'
        );
    }

    if (revision !== expectedRevision + 1) {
        throw makeError(
            'PERSISTENCE_INVALID_REVISION_TRANSITION',
            'revision must equal expectedRevision + 1'
        );
    }

    assertNonemptyString(
        savedAt,
        'savedAt'
    );

    if (Number.isNaN(Date.parse(savedAt))) {
        throw new TypeError(
            'savedAt must be a valid date-time string'
        );
    }
}

function getAttemptIds(session) {
    return session.attempts.map(
        attempt => attempt.attemptId
    );
}

/**
 * Verify that previously stored attempts form an
 * exact prefix of the session attempt sequence.
 *
 * This prevents a checkpoint from silently pointing
 * to an inconsistent attempt history.
 */

function assertAttemptPrefix(
    storedIds,
    sessionIds
) {
    if (storedIds.length > sessionIds.length) {
        throw makeError(
            'PERSISTENCE_ATTEMPT_SEQUENCE_CONFLICT',
            'Stored attempts exceed session attempts'
        );
    }

    for (
        let index = 0;
        index < storedIds.length;
        index++
    ) {
        if (storedIds[index] !== sessionIds[index]) {
            throw makeError(
                'PERSISTENCE_ATTEMPT_SEQUENCE_CONFLICT',
                `Attempt sequence mismatch at index ${index}`
            );
        }
    }
}

/**
 * ============================================================
 * FACTORY
 * ============================================================
 */

export function createPersistenceCoordinator({
    attemptStore,
    checkpointStore
} = {}) {
    assertStoreMethods(
        attemptStore,
        'attemptStore',
        [
            'appendAttempt',
            'getAttempt',
            'listAttemptIds'
        ]
    );

    assertStoreMethods(
        checkpointStore,
        'checkpointStore',
        [
            'saveCheckpoint',
            'getCheckpoint',
            'getRevision'
        ]
    );

    /**
     * ========================================================
     * PERSIST SESSION
     * ========================================================
     */

    function persistSession({
        session,
        contentRefs,
        revision,
        expectedRevision,
        savedAt
    }) {
        assertRequest({
            session,
            contentRefs,
            revision,
            expectedRevision,
            savedAt
        });

        const sessionId =
            session.runtime.sessionId;

        const requestedAttemptIds =
            getAttemptIds(session);

        /**
         * ----------------------------------------------------
         * STEP 1 — PREFLIGHT REVISION
         * ----------------------------------------------------
         *
         * The current revision may be:
         *
         * - expectedRevision: normal new write
         * - revision: possible idempotent retry
         *
         * A retry must still pass checkpoint content
         * comparison inside CheckpointStore.
         */

        const currentRevision =
            checkpointStore.getRevision({
                sessionId
            });

        const possibleRetry =
            currentRevision === revision;

        if (
            currentRevision !== expectedRevision &&
            !possibleRetry
        ) {
            throw makeError(
                'PERSISTENCE_REVISION_CONFLICT',
                'Checkpoint revision changed before persistence',
                {
                    sessionId,
                    expectedRevision,
                    currentRevision,
                    requestedRevision: revision
                }
            );
        }

        /**
         * ----------------------------------------------------
         * STEP 2 — ATTEMPT PREFLIGHT
         * ----------------------------------------------------
         */

        const storedIdsBefore =
            attemptStore.listAttemptIds({
                sessionId
            });

        assertAttemptPrefix(
            storedIdsBefore,
            requestedAttemptIds
        );

        /**
         * Validate already-stored attempt payloads.
         *
         * This prevents accepting an identical attemptId
         * with different content.
         *
         * AttemptStore itself remains responsible for
         * its own idempotency and conflict checks.
         */

        for (
            let index = 0;
            index < storedIdsBefore.length;
            index++
        ) {
            const attemptId = storedIdsBefore[index];

            const storedAttempt =
                attemptStore.getAttempt({
                    sessionId,
                    attemptId
                });

            const requestedAttempt =
                session.attempts[index];

            if (
                !isRecord(storedAttempt) ||
                !isRecord(requestedAttempt)
            ) {
                throw makeError(
                    'PERSISTENCE_ATTEMPT_CONFLICT',
                    `Invalid stored attempt: ${attemptId}`
                );
            }

            /**
             * Compare JSON-safe values independently
             * of object key insertion order.
             */

            if (
                canonicalJson(storedAttempt) !==
                canonicalJson(requestedAttempt)
            ) {
                throw makeError(
                    'PERSISTENCE_ATTEMPT_CONFLICT',
                    `Attempt payload conflict: ${attemptId}`
                );
            }
        }

        /**
         * ----------------------------------------------------
         * STEP 3 — APPEND MISSING ATTEMPTS
         * ----------------------------------------------------
         *
         * This step may partially succeed.
         *
         * The coordinator must not claim rollback.
         */

        let appendedCount = 0;

        try {
            for (
                let index = storedIdsBefore.length;
                index < session.attempts.length;
                index++
            ) {
                attemptStore.appendAttempt({
                    sessionId,
                    attempt: session.attempts[index]
                });

                appendedCount++;
            }

            /**
             * ------------------------------------------------
             * STEP 4 — VERIFY STORED ATTEMPTS
             * ------------------------------------------------
             */

            const persistedAttemptIds =
                attemptStore.listAttemptIds({
                    sessionId
                });

            if (
                persistedAttemptIds.length !==
                requestedAttemptIds.length
            ) {
                throw makeError(
                    'PERSISTENCE_ATTEMPT_SEQUENCE_CONFLICT',
                    'Persisted attempt count mismatch'
                );
            }

            assertAttemptPrefix(
                persistedAttemptIds,
                requestedAttemptIds
            );

            /**
             * ------------------------------------------------
             * STEP 5 — ENCODE CHECKPOINT
             * ------------------------------------------------
             */

            const checkpoint = encodeCheckpoint({
                session,
                contentRefs,
                revision,
                savedAt,
                persistedAttemptIds
            });

            /**
             * ------------------------------------------------
             * STEP 6 — SAVE CHECKPOINT USING CAS
             * ------------------------------------------------
             */

            const savedCheckpoint =
                checkpointStore.saveCheckpoint({
                    sessionId,
                    checkpoint,
                    expectedRevision
                });

            /**
             * ------------------------------------------------
             * STEP 7 — REPORT RESULT
             * ------------------------------------------------
             *
             * If this was a retry, CheckpointStore must
             * have verified identical checkpoint content.
             */

            return {
                status: possibleRetry
                    ? 'idempotent'
                    : 'committed',

                sessionId,

                revision: savedCheckpoint.revision,

                attemptIds: [
                    ...persistedAttemptIds
                ],

                checkpoint: cloneJson(
                    savedCheckpoint
                )
            };
        } catch (cause) {
            /**
             * No rollback is attempted.
             *
             * Even when appendedCount = 0, attempts may
             * already have existed from an earlier call.
             *
             * A partial write means checkpoint commit
             * has not been confirmed by this operation.
             */

            const error = makeError(
                'PERSISTENCE_WRITE_FAILED',
                'Persistence operation failed',
                {
                    sessionId,
                    requestedRevision: revision,
                    expectedRevision,
                    appendedCount,
                    partialWritePossible:
                        appendedCount > 0
                }
            );

            error.cause = cause;

            throw error;
        }
    }

    /**
     * ========================================================
     * READ PERSISTED RECORDS
     * ========================================================
     *
     * This is inspection only.
     * It does not hydrate StudySession.
     */

    function getPersistedSnapshot({ sessionId }) {
        assertNonemptyString(
            sessionId,
            'sessionId'
        );

        const checkpoint =
            checkpointStore.getCheckpoint({
                sessionId
            });

        const attemptIds =
            attemptStore.listAttemptIds({
                sessionId
            });

        return {
            sessionId,

            revision:
                checkpointStore.getRevision({
                    sessionId
                }),

            checkpoint: checkpoint === null
                ? null
                : cloneJson(checkpoint),

            attemptIds: [
                ...attemptIds
            ]
        };
    }

    function getInfo() {
        return {
            ...PERSISTENCE_COORDINATOR_INFO,
            writeOrder: [
                ...PERSISTENCE_COORDINATOR_INFO.writeOrder
            ]
        };
    }

    return Object.freeze({
        persistSession,
        getPersistedSnapshot,
        getInfo
    });
}

/**
 * ============================================================
 * CANONICAL JSON COMPARISON
 * ============================================================
 */

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (
        value !== null &&
        typeof value === 'object'
    ) {
        const result = Object.create(null);

        for (const key of Object.keys(value).sort()) {
            Object.defineProperty(result, key, {
                value: canonicalize(value[key]),
                enumerable: true,
                configurable: true,
                writable: true
            });
        }

        return result;
    }

    return value;
}

function canonicalJson(value) {
    return JSON.stringify(
        canonicalize(value)
    );
}

export function getPersistenceCoordinatorInfo() {
    return {
        ...PERSISTENCE_COORDINATOR_INFO,
        writeOrder: [
            ...PERSISTENCE_COORDINATOR_INFO.writeOrder
        ]
    };
}
