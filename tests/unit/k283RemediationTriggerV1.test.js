/**
 * tests/unit/k283RemediationTriggerV1.test.js
 *
 * K283 Remediation Trigger Verification V1
 *
 * Uses the REAL AdaptiveEngine (decideNextAction) and current production
 * policies (src/policies/adaptive/rules.json + paths.json).
 *
 * Verifies exact REMEDIATE trigger conditions by inspecting the actual
 * decision output shape — action + reason.primary + reason.codes.
 * Does NOT hardcode expected REMEDIATE; asserts only what the policy produces.
 *
 * Runner: node:test (project convention, type:module).
 * No engine modifications, no checkpoint I/O, no question bank I/O.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { decideNextAction } from '../../src/engines/adaptive/adaptiveEngine.js';
import adaptiveRules from '../../src/policies/adaptive/rules.json' with { type: 'json' };
import adaptivePaths from '../../src/policies/adaptive/paths.json' with { type: 'json' };
import knowledgeMap   from '../../src/data/knowledge/knowledge-map-v4.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Known policy reason strings (from real engine output — read-only audit)
// ---------------------------------------------------------------------------
const REASON_REPEATED_FAILURE  = 'Lỗi có tính hệ thống.';
const REASON_WEAK_STATUS       = 'Node đang có failure pattern cần xử lý.';
const REASON_ACTIVE_REMEDIATION= 'Đang có remediation chưa hoàn tất.';

// ---------------------------------------------------------------------------
// Fixture builders — isolated, immutable, no shared state
// ---------------------------------------------------------------------------

const STUDENT_ID  = 'test-student-k283-trigger';
const TARGET_NODE = 'K283';

function developingState() {
    return {
        nodeId: TARGET_NODE, mastery: 'M2', status: 'developing',
        evidence: { know: 0.5, explain: 0.3, apply: 0.0, transfer: 0.0 },
        confidence: { level: 'medium', score: 0.5 },
        failure: null, failureSummary: null
    };
}

function weakState() {
    return {
        nodeId: TARGET_NODE, mastery: 'M1', status: 'weak',
        evidence: { know: 0.2, explain: 0.1, apply: 0.0, transfer: 0.0 },
        confidence: { level: 'low', score: 0.2 },
        failure: { failureType: 'concept_confusion', count: 2 },
        failureSummary: { concept_confusion: 2 }
    };
}

function failureSignal(repeated) {
    return {
        nodeId: TARGET_NODE, correct: false,
        failureType: 'concept_confusion',
        signature: 'concept_confusion',
        repeated,
        count: repeated,
        sameFailureSignatureCount: repeated,
        sourceNodeId: null
    };
}

function correctSignal() {
    return {
        nodeId: TARGET_NODE, correct: true,
        failureType: null, signature: null,
        repeated: 0, count: 0, sameFailureSignatureCount: 0
    };
}

function decide(overrides = {}) {
    return decideNextAction({
        studentId:    STUDENT_ID,
        targetNodeId: TARGET_NODE,
        masteryState: developingState(),
        knowledgeMap,
        adaptiveRules,
        adaptivePaths,
        recentResults: [],
        sessionContext: {},
        learningMode: 'HOC_SAU',
        ...overrides
    });
}

// ===========================================================================
// RT-001: One incorrect attempt — repeatedCount=1 → NOT REMEDIATE
// ===========================================================================
test('RT-001: one incorrect (repeatedCount=1) → action ≠ REMEDIATE', () => {
    const d = decide({ recentResults: [failureSignal(1)] });
    assert.notEqual(d.action, 'REMEDIATE',
        `action=${d.action}, codes=${JSON.stringify(d.reason?.codes)}`);
    assert.ok(typeof d.action === 'string' && d.action.length > 0);
});

// ===========================================================================
// RT-002: Two consecutive incorrects — repeatedCount=2 → REMEDIATE (systematic failure)
// ===========================================================================
test('RT-002: two consecutive incorrects (repeatedCount=2) → REMEDIATE systematic failure', () => {
    const d = decide({ recentResults: [failureSignal(2)] });
    assert.equal(d.action, 'REMEDIATE');
    assert.equal(d.reason?.primary, REASON_REPEATED_FAILURE,
        `Got: ${d.reason?.primary}`);
});

// ===========================================================================
// RT-003: Three consecutive incorrects — repeatedCount=3 → REMEDIATE
// ===========================================================================
test('RT-003: three consecutive incorrects (repeatedCount=3) → REMEDIATE systematic failure', () => {
    const d = decide({ recentResults: [failureSignal(3)] });
    assert.equal(d.action, 'REMEDIATE');
    assert.equal(d.reason?.primary, REASON_REPEATED_FAILURE);
});

// ===========================================================================
// RT-004: Node status = weak → REMEDIATE (weak status, no recentResults needed)
// ===========================================================================
test('RT-004: status=weak → REMEDIATE weak-status rule', () => {
    const d = decide({ masteryState: weakState(), recentResults: [] });
    assert.equal(d.action, 'REMEDIATE');
    assert.equal(d.reason?.primary, REASON_WEAK_STATUS,
        `Got: ${d.reason?.primary}`);
    assert.ok(d.reason?.codes?.includes('STATUS_WEAK'),
        `codes=${JSON.stringify(d.reason?.codes)}`);
});

// ===========================================================================
// RT-005: Recovery — correctSignal has sameFailureSignatureCount=0 → NOT REMEDIATE
// ===========================================================================
test('RT-005: correct attempt (sameFailureSignatureCount=0) does not contribute repeatedCount', () => {
    // Policy: repeatedCount is driven by candidate.sameFailureSignatureCount.
    // A correctSignal has 0 — so with only correct signals, no failure pattern fires.
    const d = decide({ recentResults: [correctSignal()] });
    assert.notEqual(d.action, 'REMEDIATE',
        `Recovery: expected ≠ REMEDIATE, got action=${d.action}`);
    assert.equal(correctSignal().sameFailureSignatureCount, 0);
});

// ===========================================================================
// RT-006: Active remediation flag → REMEDIATE (active remediation continuation)
// ===========================================================================
test('RT-006: activeRemediation in sessionContext → REMEDIATE active-remediation rule', () => {
    const d = decide({
        sessionContext: { activeRemediation: true, remediationTargetNodeId: TARGET_NODE }
    });
    assert.equal(d.action, 'REMEDIATE');
    assert.equal(d.reason?.primary, REASON_ACTIVE_REMEDIATION,
        `Got: ${d.reason?.primary}`);
});

// ===========================================================================
// RT-007: Prerequisite gap (K282 = M0) — engine may or may not block
//         depending on knowledge map D1 prereqs; assert policy-consistent result.
// ===========================================================================
test('RT-007: K282 prerequisite at M0 → engine returns valid action; if REMEDIATE then prereq reason', () => {
    const masteryWithPrereqGap = {
        knowledge: {
            K283: developingState(),
            K282: {
                nodeId: 'K282', mastery: 'M0', status: 'developing',
                evidence: { know: 0, explain: 0, apply: 0, transfer: 0 },
                confidence: { level: 'low', score: 0 }
            }
        }
    };

    const d = decideNextAction({
        studentId: STUDENT_ID, targetNodeId: TARGET_NODE,
        masteryState: masteryWithPrereqGap,
        knowledgeMap, adaptiveRules, adaptivePaths,
        recentResults: [], sessionContext: {}, learningMode: 'HOC_SAU'
    });

    assert.ok(typeof d.action === 'string' && d.action.length > 0,
        `Engine must return valid action; got: ${d.action}`);

    // If REMEDIATE triggered, reason must mention prerequisite or blocking
    if (d.action === 'REMEDIATE') {
        const prereqSignals = ['prerequisite', 'Prerequisite', 'prereq',
                               'Không thể học', 'blocking'];
        const mentionsPrereq = prereqSignals.some(s =>
            (d.reason?.primary ?? '').includes(s) ||
            (d.reason?.codes ?? []).some(c => c.toLowerCase().includes('prereq'))
        );
        assert.ok(mentionsPrereq,
            `REMEDIATE from prereq scenario must mention prerequisite in reason. Got: ${JSON.stringify(d.reason)}`);
    }
});
