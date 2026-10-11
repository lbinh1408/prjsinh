import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decideNextAction } from '../src/engines/adaptive/adaptiveEngine.js';
const rules = JSON.parse(fs.readFileSync(new URL('../src/policies/adaptive/rules.json', import.meta.url)));
const bank = JSON.parse(fs.readFileSync(new URL('../src/data/questions/c09/K283.question-bank.json', import.meta.url)));
const base = { studentId: 'audit', targetNodeId: 'K283', adaptiveRules: rules, knowledgeMap: {}, learningMode: 'HOC_SAU', now: '2026-10-11T12:00:00.000Z' };
const decide = (mastery, evidence, extra = {}) => decideNextAction({ ...base, ...extra, masteryState: { mastery, status: 'developing', evidence } });
test('K283 bank has eligible know questions', () => {
    assert.ok(bank.questions.some(q => q.evidence === 'know' && ['D1', 'D2'].includes(q.difficulty) && (q.mode?.includes('learning') || q.mode?.includes('practice'))));
});
test('M0 with missing know routes LEARN to know only', () => {
    const d = decide('M0', { know: 0, explain: .85, apply: 1 });
    assert.equal(d.action, 'LEARN'); assert.deepEqual(d.selectionCriteria.evidenceDimensions, ['know']);
});
test('M0 with sufficient know preserves normal selection', () => {
    const d = decide('M0', { know: .7, explain: .85, apply: 1 });
    assert.deepEqual(d.selectionCriteria.evidenceDimensions, ['know', 'explain']);
});
test('feature off preserves normal selection', () => {
    const d = decide('M0', { know: 0 }, { adaptiveRules: { ...rules, evidenceGapRouting: { enabled: false, nodeIds: ['K283'] } } });
    assert.deepEqual(d.selectionCriteria.evidenceDimensions, ['know', 'explain']);
});
test('other nodes unaffected', () => {
    const d = decide('M0', { know: 0 }, { targetNodeId: 'K999' });
    assert.deepEqual(d.selectionCriteria.evidenceDimensions, ['know', 'explain']);
});
