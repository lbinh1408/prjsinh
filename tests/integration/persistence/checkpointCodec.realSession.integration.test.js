
/**
 * Phase 3.2 — Checkpoint Codec Real StudySession Integration
 *
 * Status: DRAFT — NOT LOCKED
 *
 * This module defines real-session checkpoint tests.
 * The caller must supply existing K283 integration fixtures.
 *
 * No mocked StudySession.
 * No modification to locked engines.
 * No hydration or durable storage claims.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    encodeCheckpoint,
    decodeCheckpoint,
    validateCheckpoint
} from '../../../src/persistence/checkpointCodec.js';

const SAVED_AT = '2026-10-08T10:00:00.000Z';

const CONTENT_REFS = {
    knowledgeMap: {
        id: 'knowledge-map-v4',
        version: '4.0.0',
        sha256: 'a'.repeat(64)
    }
};

// Test-only hashes. They are NOT real content hashes.
// This suite tests checkpoint fidelity, not hash verification.

function assertCheckpointFidelity(session, persistedAttemptIds) {
    const before = structuredClone(session);

    const checkpoint = encodeCheckpoint({
        session,
        contentRefs: CONTENT_REFS,
        revision: 1,
        savedAt: SAVED_AT,
        persistedAttemptIds
    });

    assert.equal(validateCheckpoint(checkpoint), true);

    const decoded = decodeCheckpoint(
        JSON.stringify(checkpoint)
    );

    assert.deepStrictEqual(
        decoded.state,
        session.state,
        'Student State must be preserved'
    );

    assert.deepStrictEqual(
        decoded.currentDecision,
        session.currentDecision,
        'Current decision must be preserved'
    );

    assert.deepStrictEqual(
        decoded.currentSelection,
        session.currentSelection,
        'Current selection must be preserved'
    );

    assert.deepStrictEqual(
        decoded.currentQuestion,
        session.currentQuestion,
        'Active question must be preserved'
    );

    assert.deepStrictEqual(
        decoded.lessonRuntime.currentItem,
        session.lessonRuntime.currentItem,
        'Current lesson item must be preserved'
    );

    assert.deepStrictEqual(
        decoded.lessonRuntime.progress,
        session.lessonRuntime.progress,
        'Lesson progress must be preserved'
    );

    assert.deepStrictEqual(
        decoded.masteryRuntime.evidenceHistoryByNode,
        session.masteryRuntime.evidenceHistoryByNode,
        'Mastery evidence must be preserved'
    );

    assert.deepStrictEqual(
        decoded.history,
        session.history,
        'Session history must be preserved'
    );

    assert.deepStrictEqual(
        decoded.attemptIds,
        persistedAttemptIds,
        'Attempt references must be preserved'
    );

    assert.equal(
        Object.hasOwn(decoded, 'dependencies'),
        false
    );

    assert.equal(
        Object.hasOwn(decoded, 'attempts'),
        false
    );

    assert.equal(
        Object.hasOwn(decoded.lessonRuntime, 'plan'),
        false
    );

    assert.deepStrictEqual(
        session,
        before,
        'Checkpoint encoding must not mutate StudySession'
    );

    return decoded;
}

/**
 * Register tests using real K283 fixtures.
 *
 * @param {object} fixtures
 * @param {Function} fixtures.makeSession
 * @param {Function} fixtures.navigateToTransferSection
 * @param {Function} fixtures.selectTransferQuestion
 * @param {Function} fixtures.submitTransferAnswer
 */
export function registerCheckpointRealSessionTests(fixtures) {
    const {
        makeSession,
        navigateToTransferSection,
        selectTransferQuestion,
        submitTransferAnswer
    } = fixtures;

    for (const [name, fn] of Object.entries({
        makeSession,
        navigateToTransferSection,
        selectTransferQuestion,
        submitTransferAnswer
    })) {
        if (typeof fn !== 'function') {
            throw new TypeError(
                `Missing real K283 fixture: ${name}`
            );
        }
    }

    test(
        'P3.2-R01: initial real K283 session checkpoint round-trip',
        () => {
            const session = makeSession();

            const decoded = assertCheckpointFidelity(
                session,
                []
            );

            assert.deepStrictEqual(
                decoded.attemptIds,
                []
            );
        }
    );

    test(
        'P3.2-R02: real K283 lesson progress checkpoint round-trip',
        () => {
            const session =
                navigateToTransferSection(makeSession());

            const decoded = assertCheckpointFidelity(
                session,
                session.attempts.map(a => a.attemptId)
            );

            assert.ok(
                decoded.lessonRuntime.progress
                    .completedSectionIds.includes('S08')
            );
        }
    );

    test(
        'P3.2-R03: real K283 pending question checkpoint round-trip',
        () => {
            const selected =
                selectTransferQuestion(makeSession());

            const session = selected.session;

            const decoded = assertCheckpointFidelity(
                session,
                session.attempts.map(a => a.attemptId)
            );

            assert.ok(
                session.currentQuestion?.id,
                'Real StudySession must have a pending question'
            );

            assert.equal(
                decoded.currentQuestion.id,
                session.currentQuestion.id,
                'Checkpoint must preserve the actual selected question ID'
            );
        }
    );

    test(
        'P3.2-R04: real K283 post-answer checkpoint round-trip',
        () => {
            const session = submitTransferAnswer();

            const persistedAttemptIds =
                session.attempts.map(a => a.attemptId);

            const decoded = assertCheckpointFidelity(
                session,
                persistedAttemptIds
            );

            const observations =
                decoded.masteryRuntime
                    .evidenceHistoryByNode.K283?.transfer;

            assert.ok(
                Array.isArray(observations) &&
                observations.length > 0,
                'Real K283 transfer evidence must exist'
            );
        }
    );
}
