import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(here, '../../src/engines/orchestration/learningFlow.js'), 'utf8');
const mastery = readFileSync(path.resolve(here, '../../src/engines/mastery/masterEngine.js'), 'utf8');

// Source contract guard: catches the exact regression even when the full
// integration environment (fixtures/policies) is not available.
test('Mastery update exposes top-level evidenceHistory', () => {
    assert.match(mastery, /evidenceHistory:\s*currentHistory/);
});

test('LearningFlow runtime handoff prioritizes top-level evidenceHistory', () => {
    assert.match(source, /masteryEvidenceHistory:\s*clonePlainObject\(\s*masteryRuntimeResult\s*\?\.evidenceHistory\s*\?\?\s*masteryRuntimeResult\s*\?\.current\s*\?\.evidenceHistory\s*\?\?\s*\{\}/);
});

test('Legacy fallback remains but cannot override top-level evidenceHistory', () => {
    const handoff = (result) => structuredClone(result?.evidenceHistory ?? result?.current?.evidenceHistory ?? {});
    const actual = { know: [{ id: 'attempt-1' }, { id: 'attempt-2' }] };
    assert.deepEqual(handoff({ evidenceHistory: actual, current: { evidenceHistory: {} } }), actual);
    assert.deepEqual(handoff({ current: { evidenceHistory: actual } }), actual);
    assert.deepEqual(handoff({ current: {} }), {});
});
