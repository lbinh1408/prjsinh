
/**
 * Phase 3.2 — Attempt Store V1
 *
 * Status: DRAFT — NOT LOCKED
 *
 * Responsibilities:
 * - Store real AttemptBuilder attempts.
 * - Preserve insertion order per session.
 * - Enforce idempotency by attemptId.
 * - Reject conflicting writes.
 * - Prevent caller-owned object mutation.
 * - Return detached JSON-safe copies.
 *
 * Storage:
 * - In-memory only.
 * - NOT durable across process restarts.
 *
 * Does NOT:
 * - Modify StudySession.
 * - Modify AttemptBuilder.
 * - Modify Mastery Engine.
 * - Perform checkpoint encoding.
 * - Recompute evidence or mastery.
 * - Implement resume/hydration.
 */

export const ATTEMPT_STORE_INFO = Object.freeze({
    name: 'AttemptStore',
    version: '1.0.0-draft',
    storage: 'memory',
    durable: false,
    supportsTransactions: false,
    supportsHydration: false
});

const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

const isRecord = value =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

function fail(message) {
    throw new TypeError(
        `Invalid attempt store operation: ${message}`
    );
}

function conflict(message) {
    const error = new Error(
        `Attempt conflict: ${message}`
    );

    error.code = 'ATTEMPT_CONFLICT';

    return error;
}

/**
 * Strict JSON clone.
 *
 * Rejects:
 * - undefined
 * - functions
 * - symbols
 * - BigInt
 * - NaN / Infinity
 * - sparse arrays
 * - cyclic structures
 * - Date, Map, Set and other non-plain objects
 *
 * Does not silently discard data.
 */

function assertJsonValue(value, path = 'value', seen = new Set()) {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean'
    ) {
        return;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            fail(`${path} must be a finite number`);
        }

        return;
    }

    if (typeof value !== 'object') {
        fail(`${path} is not JSON-safe`);
    }

    if (seen.has(value)) {
        fail(`${path} contains a circular reference`);
    }

    const prototype = Object.getPrototypeOf(value);

    if (
        !Array.isArray(value) &&
        prototype !== Object.prototype &&
        prototype !== null
    ) {
        fail(`${path} must be a plain object`);
    }

    seen.add(value);

    try {
        if (Array.isArray(value)) {
            const keys = Object.keys(value);

            for (const key of keys) {
                if (
                    !/^(0|[1-9]\d*)$/.test(key) ||
                    !Number.isSafeInteger(Number(key)) ||
                    Number(key) >= value.length
                ) {
                    fail(`${path} has unsupported array property`);
                }
            }

            for (let i = 0; i < value.length; i++) {
                if (!hasOwn(value, i)) {
                    fail(`${path}[${i}] is a sparse array slot`);
                }

                assertJsonValue(
                    value[i],
                    `${path}[${i}]`,
                    seen
                );
            }

            return;
        }

        if (Object.getOwnPropertySymbols(value).length > 0) {
            fail(`${path} has symbol properties`);
        }

        for (const key of Object.keys(value)) {
            assertJsonValue(
                value[key],
                `${path}.${key}`,
                seen
            );
        }
    } finally {
        seen.delete(value);
    }
}

function jsonCopy(value, label) {
    assertJsonValue(value, label);

    let encoded;

    try {
        encoded = JSON.stringify(value);
    } catch (error) {
        fail(`${label} cannot be serialized: ${error.message}`);
    }

    if (typeof encoded !== 'string') {
        fail(`${label} cannot be serialized`);
    }

    return JSON.parse(encoded);
}

function requireNonemptyString(value, name) {
    if (
        typeof value !== 'string' ||
        value.trim().length === 0
    ) {
        fail(`${name} must be a nonempty string`);
    }
}

function validateAttempt(attempt) {
    if (!isRecord(attempt)) {
        fail('attempt must be an object');
    }

    requireNonemptyString(
        attempt.attemptId,
        'attempt.attemptId'
    );

    return jsonCopy(attempt, 'attempt');
}

function validateSessionId(sessionId) {
    requireNonemptyString(
        sessionId,
        'sessionId'
    );
}

/**
 * Canonical JSON representation.
 *
 * Object key order does not affect equality.
 * Array order remains significant.
 */

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (isRecord(value)) {
        const result = {};

        for (const key of Object.keys(value).sort()) {
            Object.defineProperty(result, key, {
                value: canonicalize(value[key]),
                enumerable: true,
                writable: true,
                configurable: true
            });
        }

        return result;
    }

    return value;
}

function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
}

/**
 * Create an isolated in-memory store.
 *
 * Each store instance has independent data.
 */

export function createAttemptStore() {
    // sessionId -> Map(attemptId -> storedAttempt)
    const sessions = new Map();

    // Global attemptId ownership.
    // An attemptId must never belong to two different sessions.
    const owners = new Map();

    /**
     * Append one attempt.
     *
     * Idempotency:
     * - Same sessionId + attemptId + payload: no-op.
     * - Same sessionId + attemptId + different payload: conflict.
     * - Same attemptId + different sessionId: conflict.
     *
     * Returns a detached copy of the stored attempt.
     */

    function appendAttempt({ sessionId, attempt }) {
        validateSessionId(sessionId);

        const safeAttempt = validateAttempt(attempt);
        const attemptId = safeAttempt.attemptId;

        if (
            hasOwn(safeAttempt, 'sessionId') &&
            safeAttempt.sessionId !== sessionId
        ) {
            fail(
                'attempt.sessionId does not match sessionId'
            );
        }

        const existingOwner = owners.get(attemptId);

        if (
            existingOwner !== undefined &&
            existingOwner !== sessionId
        ) {
            throw conflict(
                `attemptId ${attemptId} belongs to another session`
            );
        }

        let sessionAttempts = sessions.get(sessionId);

        if (sessionAttempts?.has(attemptId)) {
            const existing = sessionAttempts.get(attemptId);

            if (
                canonicalJson(existing) !==
                canonicalJson(safeAttempt)
            ) {
                throw conflict(
                    `attemptId ${attemptId} has different content`
                );
            }

            return jsonCopy(existing, 'storedAttempt');
        }

        if (!sessionAttempts) {
            sessionAttempts = new Map();
            sessions.set(sessionId, sessionAttempts);
        }

        sessionAttempts.set(attemptId, safeAttempt);
        owners.set(attemptId, sessionId);

        return jsonCopy(safeAttempt, 'storedAttempt');
    }

    /**
     * Read one attempt by sessionId and attemptId.
     *
     * Returns null if not found.
     */

    function getAttempt({ sessionId, attemptId }) {
        validateSessionId(sessionId);

        requireNonemptyString(
            attemptId,
            'attemptId'
        );

        const attempt =
            sessions.get(sessionId)?.get(attemptId);

        return attempt === undefined
            ? null
            : jsonCopy(attempt, 'storedAttempt');
    }

    /**
     * Return attempts in insertion order.
     */

    function listAttempts({ sessionId }) {
        validateSessionId(sessionId);

        const sessionAttempts = sessions.get(sessionId);

        if (!sessionAttempts) {
            return [];
        }

        return Array.from(
            sessionAttempts.values(),
            attempt => jsonCopy(
                attempt,
                'storedAttempt'
            )
        );
    }

    /**
     * Return attempt IDs in insertion order.
     *
     * This is intended to support the
     * checkpointCodec persistedAttemptIds argument.
     *
     * IMPORTANT:
     * In-memory presence is NOT durable persistence.
     */

    function listAttemptIds({ sessionId }) {
        validateSessionId(sessionId);

        const sessionAttempts = sessions.get(sessionId);

        return sessionAttempts
            ? Array.from(sessionAttempts.keys())
            : [];
    }

    /**
     * Check whether an attempt exists.
     */

    function hasAttempt({ sessionId, attemptId }) {
        validateSessionId(sessionId);

        requireNonemptyString(
            attemptId,
            'attemptId'
        );

        return (
            sessions.get(sessionId)?.has(attemptId) ??
            false
        );
    }

    /**
     * Number of attempts stored for a session.
     */

    function countAttempts({ sessionId }) {
        validateSessionId(sessionId);

        return sessions.get(sessionId)?.size ?? 0;
    }

    /**
     * Store metadata.
     */

    function getInfo() {
        return {
            ...ATTEMPT_STORE_INFO
        };
    }

    return Object.freeze({
        appendAttempt,
        getAttempt,
        listAttempts,
        listAttemptIds,
        hasAttempt,
        countAttempts,
        getInfo
    });
}

export function getAttemptStoreInfo() {
    return {
        ...ATTEMPT_STORE_INFO
    };
}
