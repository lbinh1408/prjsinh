
/**
 * ============================================================
 * checkpointStore.js
 * ============================================================
 *
 * Phase 3.2 — Checkpoint Store V1
 *
 * Status: DRAFT — NOT LOCKED
 *
 * RESPONSIBILITY
 *
 * Store already encoded StudySession checkpoints.
 *
 * The store does NOT:
 *
 * - encode StudySession
 * - decode or hydrate StudySession
 * - calculate mastery
 * - run adaptive decisions
 * - persist attempts
 * - resolve content dependencies
 * - verify actual content SHA-256
 * - write data to disk or database
 *
 * CheckpointCodec owns checkpoint validation.
 *
 * CheckpointStore owns:
 *
 * - session ownership
 * - revision sequencing
 * - optimistic concurrency (CAS)
 * - idempotent retries
 * - immutable storage boundaries
 *
 * Revision contract:
 *
 * CREATE:
 *   expectedRevision = 0
 *   checkpoint.revision = 1
 *
 * UPDATE:
 *   expectedRevision = currentRevision
 *   checkpoint.revision = currentRevision + 1
 *
 * RETRY:
 *   checkpoint.revision = currentRevision
 *   checkpoint content identical to stored content
 *   => idempotent success
 *
 * CONFLICT:
 *   stale expectedRevision
 *   reused revision with different payload
 *   invalid revision transition
 *
 * ============================================================
 */

import {
    validateCheckpoint
} from './checkpointCodec.js';

/**
 * ============================================================
 * CAPABILITIES
 * ============================================================
 */

export const CHECKPOINT_STORE_INFO = Object.freeze({
    name: 'CheckpointStore',
    version: '1.0.0-draft',

    storage: 'memory',

    durable: false,
    supportsTransactions: false,
    supportsCAS: true,
    supportsIdempotency: true,

    supportsHydration: false,
    supportsPersistence: false
});

/**
 * ============================================================
 * INTERNAL UTILITIES
 * ============================================================
 */

function isRecord(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
    );
}

function assertSessionId(sessionId) {
    if (
        typeof sessionId !== 'string' ||
        sessionId.trim().length === 0
    ) {
        throw new TypeError(
            'Invalid checkpoint store operation: ' +
            'sessionId must be a nonempty string'
        );
    }
}

function assertRevision(value, fieldName) {
    if (
        !Number.isSafeInteger(value) ||
        value < 0
    ) {
        throw new TypeError(
            'Invalid checkpoint store operation: ' +
            `${fieldName} must be a nonnegative safe integer`
        );
    }
}

function makeError(code, message) {
    const error = new Error(message);

    error.code = code;

    return error;
}

function revisionConflict(message) {
    return makeError(
        'CHECKPOINT_REVISION_CONFLICT',
        `Checkpoint revision conflict: ${message}`
    );
}

function sessionConflict(message) {
    return makeError(
        'CHECKPOINT_SESSION_CONFLICT',
        `Checkpoint session conflict: ${message}`
    );
}

/**
 * Ensure JSON round-trip safety.
 *
 * This is an additional storage boundary check.
 * CheckpointCodec remains authoritative for
 * checkpoint structure and semantics.
 */

function assertJsonSafe(value, path = '$', seen = new Set()) {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean'
    ) {
        return;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError(
                `Invalid JSON value at ${path}: non-finite number`
            );
        }

        return;
    }

    if (typeof value !== 'object') {
        throw new TypeError(
            `Invalid JSON value at ${path}: unsupported type`
        );
    }

    if (seen.has(value)) {
        throw new TypeError(
            `Invalid JSON value at ${path}: circular reference`
        );
    }

    const prototype = Object.getPrototypeOf(value);

    if (
        !Array.isArray(value) &&
        prototype !== Object.prototype &&
        prototype !== null
    ) {
        throw new TypeError(
            `Invalid JSON value at ${path}: non-plain object`
        );
    }

    seen.add(value);

    try {
        if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index++) {
                if (!Object.hasOwn(value, index)) {
                    throw new TypeError(
                        `Invalid JSON value at ${path}: sparse array`
                    );
                }

                assertJsonSafe(
                    value[index],
                    `${path}[${index}]`,
                    seen
                );
            }

            for (const key of Object.keys(value)) {
                const index = Number(key);

                const validIndex =
                    Number.isInteger(index) &&
                    index >= 0 &&
                    index < value.length &&
                    String(index) === key;

                if (!validIndex) {
                    throw new TypeError(
                        `Invalid JSON value at ${path}: extra array property`
                    );
                }
            }
        } else {
            for (const key of Object.keys(value)) {
                assertJsonSafe(
                    value[key],
                    `${path}.${key}`,
                    seen
                );
            }
        }

        if (Object.getOwnPropertySymbols(value).length > 0) {
            throw new TypeError(
                `Invalid JSON value at ${path}: symbol keys`
            );
        }
    } finally {
        seen.delete(value);
    }
}

function cloneJson(value) {
    return JSON.parse(
        JSON.stringify(value)
    );
}

/**
 * Canonical representation for content equality.
 *
 * Object key insertion order is irrelevant.
 * Array order remains significant.
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

/**
 * Normalize a checkpoint through the codec.
 *
 * The codec may validate by throwing or returning
 * a validation result, depending on its contract.
 *
 * This function deliberately does not assume
 * validateCheckpoint() returns a cloned checkpoint.
 */

function normalizeCheckpoint(checkpoint) {
    if (!isRecord(checkpoint)) {
        throw new TypeError(
            'Invalid checkpoint store operation: ' +
            'checkpoint must be an object'
        );
    }

    assertJsonSafe(checkpoint);

    const normalized = cloneJson(checkpoint);

    const validation = validateCheckpoint(normalized);

    if (
        validation === false ||
        (
            isRecord(validation) &&
            validation.valid === false
        )
    ) {
        throw new TypeError(
            'Invalid checkpoint store operation: ' +
            'checkpoint failed codec validation'
        );
    }

    return normalized;
}

/**
 * Read the checkpoint session identity.
 *
 * CheckpointCodec V1 projects runtime.sessionId.
 */

function getCheckpointSessionId(checkpoint) {
    return checkpoint.runtime?.sessionId;
}

/**
 * ============================================================
 * FACTORY
 * ============================================================
 */

export function createCheckpointStore() {
    /**
     * sessionId -> {
     *   revision,
     *   checkpoint,
     *   canonical
     * }
     */
    const checkpoints = new Map();

    /**
     * ========================================================
     * SAVE
     * ========================================================
     *
     * Returns a detached checkpoint copy.
     *
     * CAS must be evaluated against the current
     * revision in the store.
     *
     * An exact retry of the latest stored checkpoint
     * is allowed, even if expectedRevision reflects
     * the revision before the successful write.
     */

    function saveCheckpoint({
        sessionId,
        checkpoint,
        expectedRevision
    }) {
        assertSessionId(sessionId);
        assertRevision(expectedRevision, 'expectedRevision');

        const normalized = normalizeCheckpoint(
            checkpoint
        );

        const checkpointSessionId =
            getCheckpointSessionId(normalized);

        if (checkpointSessionId !== sessionId) {
            throw sessionConflict(
                'checkpoint runtime.sessionId does not match sessionId'
            );
        }

        assertRevision(
            normalized.revision,
            'checkpoint.revision'
        );

        if (normalized.revision < 1) {
            throw revisionConflict(
                'checkpoint revision must start at 1'
            );
        }

        const current = checkpoints.get(
            sessionId
        );

        const currentRevision =
            current?.revision ?? 0;

        const incomingCanonical =
            canonicalJson(normalized);

        /**
         * Idempotent retry of the latest checkpoint.
         *
         * The retry must be byte-equivalent after
         * canonical JSON normalization.
         *
         * No revision is advanced.
         */

        if (
            current &&
            normalized.revision === currentRevision &&
            incomingCanonical === current.canonical &&
            (
                expectedRevision === currentRevision ||
                expectedRevision === currentRevision - 1
            )
        ) {
            return cloneJson(
                current.checkpoint
            );
        }

        /**
         * Reject stale or speculative writers.
         */

        if (expectedRevision !== currentRevision) {
            throw revisionConflict(
                `expected ${expectedRevision}, ` +
                `current ${currentRevision}`
            );
        }

        /**
         * Every successful new write advances exactly
         * one revision.
         */

        const requiredRevision =
            currentRevision + 1;

        if (
            normalized.revision !== requiredRevision
        ) {
            throw revisionConflict(
                `incoming revision ${normalized.revision}, ` +
                `required revision ${requiredRevision}`
            );
        }

        const storedCheckpoint =
            cloneJson(normalized);

        checkpoints.set(sessionId, {
            revision: requiredRevision,
            checkpoint: storedCheckpoint,
            canonical: incomingCanonical
        });

        return cloneJson(
            storedCheckpoint
        );
    }

    /**
     * ========================================================
     * GET
     * ========================================================
     */

    function getCheckpoint({ sessionId }) {
        assertSessionId(sessionId);

        const record = checkpoints.get(
            sessionId
        );

        if (!record) {
            return null;
        }

        return cloneJson(
            record.checkpoint
        );
    }

    /**
     * ========================================================
     * HAS
     * ========================================================
     */

    function hasCheckpoint({ sessionId }) {
        assertSessionId(sessionId);

        return checkpoints.has(
            sessionId
        );
    }

    /**
     * ========================================================
     * REVISION
     * ========================================================
     *
     * Missing session returns 0.
     */

    function getRevision({ sessionId }) {
        assertSessionId(sessionId);

        return checkpoints.get(
            sessionId
        )?.revision ?? 0;
    }

    /**
     * ========================================================
     * INFO
     * ========================================================
     */

    function getInfo() {
        return {
            ...CHECKPOINT_STORE_INFO
        };
    }

    return Object.freeze({
        saveCheckpoint,
        getCheckpoint,
        hasCheckpoint,
        getRevision,
        getInfo
    });
}

/**
 * ============================================================
 * PUBLIC METADATA
 * ============================================================
 */

export function getCheckpointStoreInfo() {
    return {
        ...CHECKPOINT_STORE_INFO
    };
}
