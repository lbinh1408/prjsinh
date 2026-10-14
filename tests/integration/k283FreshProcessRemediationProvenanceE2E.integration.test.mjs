/**
 * P4d.3g.4f.2 — Fresh-Process Remediation Provenance E2E
 *
 * Implements restart-level E2E coverage for the completed informational V1 provenance pipeline.
 * Uses two genuinely separate Node.js processes (Process A and Process B) for each test scenario.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    CONFLICTING_PROBE_AUTHORING_POLICY,
    DRIFTED_CANONICAL_PROBE_POLICY
} from './k283FreshProcessRemediationProvenanceE2E.worker.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, 'k283FreshProcessRemediationProvenanceE2E.worker.mjs');

function createTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'k283-p4d-fresh-process-e2e-'));
}

function runChild(command, payload) {
    const res = spawnSync(process.execPath, [workerPath, command, JSON.stringify(payload)], {
        encoding: 'utf8',
        timeout: 15000,
        env: { ...process.env, FORCE_COLOR: '0', NODE_DISABLE_COLORS: '1' }
    });
    assert.equal(res.error, undefined, `Child process threw unexpected error: ${res.error?.message}`);
    const stdout = res.stdout.trim();
    assert.ok(stdout.length > 0, `Child process produced empty stdout. stderr: ${res.stderr}`);
    const parsed = JSON.parse(stdout);
    return { res, parsed, pid: res.pid };
}

function findWrapperPath(rootDir, sessionId) {
    const dir = path.join(rootDir, 'checkpoints');
    const files = fs.readdirSync(dir).filter(f => /^[a-f0-9]{64}\.json$/.test(f));
    for (const file of files) {
        const full = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (data.sessionId === sessionId) return full;
    }
    return null;
}

test('Scenario 1: INFEASIBLE genuine generation in Process A -> clean exit -> Process B matching V1 inputs yields CURRENT_MATCH (no retry)', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-INF-MATCH';
    try {
        // Process A (runs genuine StudySession/submit path and commits with provenance)
        const { parsed: outA, pid: pidA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            remediationRules: null
        });

        assert.equal(outA.status, 'COMMITTED');
        assert.equal(outA.stopKind, 'INFEASIBLE');
        assert.equal(outA.stopExtension.status, 'INFEASIBLE');
        assert.equal(outA.hasProvenance, true);
        assert.equal(outA.provenance.stopKind, 'INFEASIBLE');
        assert.equal(outA.provenance.fingerprintContract, 'V1');
        assert.equal(outA.provenance.participation, null);
        assert.deepEqual(outA.attemptIds, [`${sessionId}-attempt-1`, `${sessionId}-attempt-2`]);
        assert.notEqual(pidA, process.pid, 'Process A must be a genuinely separate process');

        // Process B (starts only AFTER Process A has exited completely)
        const { parsed: outB, pid: pidB } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: null, // matching historical remediationRules: null
            checkM4Stable: true,
            checkSelection: true
        });

        assert.notEqual(pidB, process.pid, 'Process B must be a genuinely separate process');
        assert.notEqual(pidB, pidA, 'Process B must have a distinct PID from Process A');
        assert.equal(outB.status, 'SUCCESS');
        assert.equal(outB.progress.fromSessionId, sessionId);
        assert.equal(outB.progress.remediationProvenanceStatus, 'VERIFIED');
        assert.equal(outB.progress.hasGenerationStop, true);
        assert.equal(outB.progress.attemptCountInCheckpoint, 2);
        assert.equal(outB.progress.knowledgeAttemptStatsTotal, 2);

        // Verification of CURRENT_MATCH
        assert.equal(outB.classification.status, 'CURRENT_MATCH');
        assert.equal(outB.classification.reasonCode, 'V1_FINGERPRINT_MATCH');
        assert.equal(outB.classification.historicalFingerprint, outB.classification.currentFingerprint);

        // Assert all retry/resume authorizations remain strictly disabled
        for (const flag of ['retryAuthorized', 'resumeAuthorized', 'remediationGenerationAuthorized', 'migrationAuthorized', 'executable']) {
            assert.equal(outB.classification[flag], false, `${flag} must be false`);
        }

        // Assert committed Attempt/journal state is not replayed or recomputed
        assert.equal(outB.runtime.sessionAttemptsLength, 0, 'Restored session must have 0 attempts');

        // Assert existing stop suppression
        assert.equal(outB.selectionResult.suppressed, true);
        assert.equal(outB.selectionResult.hasQuestion ?? false, false);

        // Assert M4/stable-to-SKIP derives SKIP
        assert.equal(outB.m4Decision.action, 'SKIP');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 2: INFEASIBLE genuine generation in Process A -> clean exit -> Process B drifted V1 inputs yields RETRY_ELIGIBLE (no retry)', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-INF-DRIFT';
    try {
        const { parsed: outA, pid: pidA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            remediationRules: null
        });
        assert.equal(outA.status, 'COMMITTED');

        // Process B runs with drifted timeBudget (45 instead of 60)
        const { parsed: outB, pid: pidB } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: null,
            configDrift: { timeBudget: 45 }
        });

        assert.notEqual(pidB, pidA);
        assert.equal(outB.status, 'SUCCESS');
        assert.equal(outB.progress.remediationProvenanceStatus, 'VERIFIED');

        // Informational comparison detects changed fingerprint
        assert.equal(outB.classification.status, 'RETRY_ELIGIBLE');
        assert.equal(outB.classification.reasonCode, 'V1_FINGERPRINT_CHANGED');
        assert.notEqual(outB.classification.historicalFingerprint, outB.classification.currentFingerprint);

        // RETRY_ELIGIBLE remains informational only: NO authorization granted
        for (const flag of ['retryAuthorized', 'resumeAuthorized', 'remediationGenerationAuthorized', 'migrationAuthorized', 'executable']) {
            assert.equal(outB.classification[flag], false, `${flag} must remain false under RETRY_ELIGIBLE`);
        }
        assert.equal(outB.runtime.sessionAttemptsLength, 0);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 3: POLICY_ERROR genuine generation in Process A -> clean exit -> Process B matching policy yields CURRENT_MATCH (no retry)', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-POL-MATCH';
    try {
        const { parsed: outA, pid: pidA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'POLICY_ERROR'
        });
        assert.equal(outA.status, 'COMMITTED');
        assert.equal(outA.stopKind, 'POLICY_ERROR');
        assert.equal(outA.stopExtension.status, 'POLICY_ERROR');
        assert.equal(outA.hasProvenance, true);
        assert.equal(outA.provenance.stopKind, 'POLICY_ERROR');

        // Process B starts with matching probe authoring policy and matching remediationRules
        const { parsed: outB, pid: pidB } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: { maximumDepth: 3, maxMinutes: 30, maxQuestions: 7 },
            probeAuthoringPolicy: CONFLICTING_PROBE_AUTHORING_POLICY,
            checkSelection: true
        });

        assert.notEqual(pidB, pidA);
        assert.equal(outB.status, 'SUCCESS');
        assert.equal(outB.progress.remediationProvenanceStatus, 'VERIFIED');
        assert.equal(outB.progress.hasPolicyErrorStop, true);

        // Classification matches
        assert.equal(outB.classification.status, 'CURRENT_MATCH');
        assert.equal(outB.classification.reasonCode, 'V1_FINGERPRINT_MATCH');
        assert.equal(outB.classification.historicalFingerprint, outB.classification.currentFingerprint);

        for (const flag of ['retryAuthorized', 'resumeAuthorized', 'remediationGenerationAuthorized', 'migrationAuthorized', 'executable']) {
            assert.equal(outB.classification[flag], false);
        }

        // Selection remains suppressed
        assert.equal(outB.selectionResult.status, 'NO_MATCH');
        assert.equal(outB.runtime.sessionAttemptsLength, 0);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 4: POLICY_ERROR genuine generation in Process A -> clean exit -> Process B drifted policy yields RETRY_ELIGIBLE (no retry)', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-POL-DRIFT';
    try {
        const { parsed: outA, pid: pidA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'POLICY_ERROR'
        });
        assert.equal(outA.status, 'COMMITTED');

        // Process B runs with drifted policy content / version
        const { parsed: outB, pid: pidB } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: { maximumDepth: 3, maxMinutes: 30, maxQuestions: 7 },
            probeAuthoringPolicy: DRIFTED_CANONICAL_PROBE_POLICY
        });

        assert.notEqual(pidB, pidA);
        assert.equal(outB.status, 'SUCCESS');
        assert.equal(outB.classification.status, 'RETRY_ELIGIBLE');
        assert.equal(outB.classification.reasonCode, 'V1_FINGERPRINT_CHANGED');
        assert.notEqual(outB.classification.historicalFingerprint, outB.classification.currentFingerprint);

        for (const flag of ['retryAuthorized', 'resumeAuthorized', 'remediationGenerationAuthorized', 'migrationAuthorized', 'executable']) {
            assert.equal(outB.classification[flag], false);
        }
        assert.equal(outB.runtime.sessionAttemptsLength, 0);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 5: Legacy/removed provenance -> ABSENT_UNVERIFIED and FAIL_CLOSED without authorizing retry', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-LEGACY-REMOVED';
    try {
        const { parsed: outA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            remediationRules: null
        });
        assert.equal(outA.status, 'COMMITTED');

        // Simulate historical wrapper without provenance or whole-envelope provenance removal
        const wrapperFile = findWrapperPath(root, sessionId);
        assert.ok(wrapperFile, 'Wrapper file must exist on disk');
        const wrapperData = JSON.parse(fs.readFileSync(wrapperFile, 'utf8'));
        assert.ok(Object.hasOwn(wrapperData, 'remediationStopProvenance'));
        delete wrapperData.remediationStopProvenance;
        fs.writeFileSync(wrapperFile, JSON.stringify(wrapperData));

        // Process B starts in fresh process
        const { parsed: outB } = runChild('process-b', {
            rootDir: root,
            sessionId
        });

        assert.equal(outB.status, 'SUCCESS');
        assert.equal(outB.progress.remediationProvenanceStatus, 'ABSENT_UNVERIFIED');
        assert.equal(outB.progress.remediationProvenance, null);

        // Fails closed: comparison unsupported without verified provenance
        assert.equal(outB.classification.status, 'FAIL_CLOSED');
        assert.equal(outB.classification.reasonCode, 'INVALID_OR_UNSUPPORTED_COMPARISON');
        assert.equal(outB.classification.retryAuthorized, false);
        assert.equal(outB.classification.resumeAuthorized, false);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 6: Present corrupt provenance -> fatal read failure in Process B', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-CORRUPT';
    try {
        const { parsed: outA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            remediationRules: null
        });
        assert.equal(outA.status, 'COMMITTED');

        // Tamper with provenance fields in the durable wrapper
        const wrapperFile = findWrapperPath(root, sessionId);
        const wrapperData = JSON.parse(fs.readFileSync(wrapperFile, 'utf8'));
        wrapperData.remediationStopProvenance.stopFingerprint = 'f'.repeat(64); // Mismatched digest
        fs.writeFileSync(wrapperFile, JSON.stringify(wrapperData));

        // Process B starts in fresh process
        const { parsed: outB } = runChild('process-b', {
            rootDir: root,
            sessionId
        });

        // Must fail with fatal read failure
        assert.equal(outB.status, 'FATAL_READ_FAILURE');
        assert.match(outB.errorCode, /SESSION_COMMIT_CORRUPT|K283_PREVIOUS_SESSION_NOT_AUDITED/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 7: Explicit remediationRules: null is preserved without normalization; invalid rules reject without fallback', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-RULES-NULL';
    try {
        const { parsed: outA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            remediationRules: null
        });
        assert.equal(outA.status, 'COMMITTED');

        // Test B1: Process B with explicit remediationRules: null -> CURRENT_MATCH
        const { parsed: outB1 } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: null
        });
        assert.equal(outB1.classification.status, 'CURRENT_MATCH');
        assert.equal(outB1.classification.reasonCode, 'V1_FINGERPRINT_MATCH');

        // Test B2: Process B with remediationRules: {} -> RETRY_ELIGIBLE (null and {} are NOT normalized together)
        const { parsed: outB2 } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: {}
        });
        assert.equal(outB2.classification.status, 'RETRY_ELIGIBLE');
        assert.equal(outB2.classification.reasonCode, 'V1_FINGERPRINT_CHANGED');

        // Test B3: Process B with invalid remediationRules (e.g. array) -> FAIL_CLOSED
        const { parsed: outB3 } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: []
        });
        assert.equal(outB3.classification.status, 'FAIL_CLOSED');
        assert.equal(outB3.classification.reasonCode, 'INVALID_OR_UNSUPPORTED_COMPARISON');
        // Resolver must also fail closed without fallback
        assert.equal(outB3.resolverStatus, 'FAIL_CLOSED');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 8: Injected failure before atomic rename (afterTempFsync): preserves prior wrapper intact', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-FAILPOINT-BEFORE';
    try {
        // Step 1: Process A runs turn 1 (which commits revision 1 cleanly) and turn 2 (which throws afterTempFsync before rename)
        const { parsed: outFail } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            failpoint: 'afterTempFsync'
        });
        assert.equal(outFail.status, 'INJECTED_FAILURE_THROWN');
        assert.equal(outFail.errorCode, 'SESSION_COMMIT_INJECTED_FAILURE');

        // Step 2: Process B reads durable state in a fresh process
        const { parsed: outB } = runChild('process-b', {
            rootDir: root,
            sessionId,
            rawDurableRead: true
        });

        assert.equal(outB.status, 'SUCCESS');
        assert.ok(outB.rawRead !== null);
        assert.equal(outB.rawRead.checkpointRevision, 1, 'Prior revision 1 wrapper must remain intact on disk');
        assert.equal(outB.rawRead.hasProvenance, false, 'Revision 1 wrapper had no stop or provenance');
        assert.equal(outB.audit.error, 'SESSION_COMMIT_ATTEMPT_SEQUENCE_CONFLICT', 'Audit guards against attempt drift when commit failed before rename');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 9: Injected failure after atomic rename (afterRename): new wrapper successfully replaced and readable', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-FAILPOINT-AFTER';
    try {
        // Process A turn 1 commits revision 1; turn 2 renames revision 2 wrapper, then throws afterRename
        const { parsed: outFail } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            failpoint: 'afterRename'
        });
        assert.equal(outFail.status, 'INJECTED_FAILURE_THROWN');
        assert.equal(outFail.errorCode, 'SESSION_COMMIT_INJECTED_FAILURE');

        // Process B reads durable state: atomic rename already succeeded before post-rename failure
        const { parsed: outB } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: null
        });

        assert.equal(outB.status, 'SUCCESS');
        assert.equal(outB.progress.fromSessionId, sessionId);
        assert.equal(outB.progress.remediationProvenanceStatus, 'VERIFIED');
        assert.equal(outB.classification.status, 'CURRENT_MATCH');
        assert.equal(outB.runtime.sessionAttemptsLength, 0);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('Scenario 10: Contract bounds: V2 generation disabled, no retry/resume authorization, no attempt re-execution', () => {
    const root = createTempRoot();
    const sessionId = 'LIVE-K283-E2E-CONTRACT-BOUNDS';
    try {
        const { parsed: outA } = runChild('process-a', {
            rootDir: root,
            sessionId,
            stopKind: 'INFEASIBLE',
            remediationRules: null
        });
        assert.equal(outA.status, 'COMMITTED');
        assert.equal(outA.provenance.fingerprintContract, 'V1');
        assert.equal(outA.provenance.participation, null);

        const { parsed: outB } = runChild('process-b', {
            rootDir: root,
            sessionId,
            overrideRules: null
        });

        assert.equal(outB.status, 'SUCCESS');
        assert.equal(outB.classification.fingerprintContract, undefined); // classification has status/reasonCode/fingerprints only
        assert.equal(outB.classification.retryAuthorized, false);
        assert.equal(outB.classification.resumeAuthorized, false);
        assert.equal(outB.classification.remediationGenerationAuthorized, false);
        assert.equal(outB.classification.migrationAuthorized, false);
        assert.equal(outB.classification.executable, false);
        assert.equal(outB.runtime.sessionAttemptsLength, 0);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
