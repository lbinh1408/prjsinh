
/**
 * Phase 3.3-B — Hydration Planner V1
 *
 * Orchestrates:
 *   Contract -> Reader -> Validator -> Candidate
 *
 * Read-only. Synchronous. Non-executable.
 */

import {
    validateHydrationRequest,
    HydrationError,
    HYDRATION_ERROR_CODES as C
} from './hydrationContract.js';

import {
    readHydrationSnapshot
} from './hydrationReader.js';

import {
    validateHydrationSnapshot
} from './hydrationValidator.js';

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function fail(message) {
    throw new HydrationError(C.PLAN_INVALID, message);
}

/**
 * Prepare a validated restoration candidate.
 *
 * @param {object} request
 * @returns {object} Detached, non-executable candidate
 * @throws {HydrationError}
 */
export function planHydration(request) {
    // Gate 1: validate caller input before reading stores.
    validateHydrationRequest(request);

    // Gate 2: read a consistency-checked candidate.
    const snapshot = readHydrationSnapshot(request);

    // Gate 3: validate checkpoint and attempt semantics.
    const valid = validateHydrationSnapshot(snapshot, {
        sessionId: request.sessionId,
        expectedContentRefs: request.expectedContentRefs
    });

    if (valid !== true) {
        fail('Hydration validation did not succeed.');
    }

    const { checkpoint, attempts, revision } = snapshot;

    // Construct only after every validation gate passes.
    const candidate = {
        status: 'ready-for-restoration',

        sessionId: request.sessionId,
        revision,

        checkpoint: cloneJson(checkpoint),
        attempts: cloneJson(attempts),
        contentRefs: cloneJson(checkpoint.contentRefs),

        runtimeVersion: checkpoint.runtime.version,

        compatibility: {
            checkpointSchemaVersion: checkpoint.schemaVersion,
            runtimeName: checkpoint.runtime.name,
            runtimeVersion: checkpoint.runtime.version,
            studentStateSchemaVersion: checkpoint.state.schemaVersion
        },

        verification: {
            checkpointValidated: true,
            attemptSequenceValidated: true,
            attemptOwnershipValidated: true,
            contentReferencesMatched: true,

            // These three guarantees are NOT established in V1.
            contentIntegrityVerified: false,
            atomicSnapshotGuaranteed: false,
            runtimeContinuityVerified: false
        },

        warnings: [
            'NON_ATOMIC_CROSS_STORE_READ',
            'RUNTIME_CONTINUITY_NOT_VERIFIED'
        ],

        executable: false
    };

    return candidate;
}
