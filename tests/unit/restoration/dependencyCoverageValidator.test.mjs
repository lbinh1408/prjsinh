import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateDependencyCoverage as validate, REQUIRED_RUNTIME_DEPENDENCIES as required } from '../../../src/restoration/dependencyCoverageValidator.js';
const copy = x => structuredClone(x);
function fixture() {
    const refs = {}, bundle = {}, bindings = {};
    for (const k of required) {
        const value = k === 'lesson' ? { id: 'lesson-1' } : { source: k };
        const bytes = Buffer.from(JSON.stringify(value));
        refs[k] = { id: k === 'lesson' ? 'lesson-1' : k, version: '1.0.0', sha256: createHash('sha256').update(bytes).digest('hex') };
        bundle[k] = { id: refs[k].id, version: refs[k].version, bytes }; bindings[k] = k;
    }
    const checkpoint = { runtime: { sessionId: 's1' }, revision: 2, config: { lessonId: 'lesson-1' }, contentRefs: refs };
    const extension = { executable: false, checkpointBinding: { sessionId: 's1', revision: 2 }, dependencyRefs: copy(refs) };
    return { checkpoint, extension, contentBundle: bundle, bindings };
}
function rejects(mod, code) { const x = fixture(); mod(x); assert.throws(() => validate(x), e => e.code === code); }
test('accepts complete byte-verified dependency set but never executable', () => { const r = validate(fixture()); assert.equal(r.dependencyCount, 9); assert.equal(r.artifactCount, 9); assert.equal(r.executable, false); assert.equal(r.provenanceVerified, false); });
test('does not mutate inputs', () => { const f = fixture(), before = Buffer.from(f.contentBundle.lesson.bytes); validate(f); assert.deepEqual(f.contentBundle.lesson.bytes, before); });
test('missing dependency binding', () => rejects(x => delete x.bindings.questionBanks, 'COVERAGE_MISSING_BINDING'));
test('extra binding', () => rejects(x => x.bindings.extra = 'lesson', 'COVERAGE_MISSING_BINDING'));
test('missing questionBanks manifest', () => rejects(x => { delete x.checkpoint.contentRefs.questionBanks; delete x.extension.dependencyRefs.questionBanks; delete x.contentBundle.questionBanks; }, 'COVERAGE_MISSING_BINDING'));
test('alias disallowed', () => rejects(x => x.bindings.questionBanks = 'knowledgeMap', 'COVERAGE_AMBIGUOUS_BINDING'));
test('duplicate binding disallowed', () => rejects(x => x.bindings.masteryRules = 'knowledgeMap', 'COVERAGE_MISSING_BINDING'));
test('unbound extra artifact', () => rejects(x => { x.checkpoint.contentRefs.extra = x.checkpoint.contentRefs.lesson; x.extension.dependencyRefs.extra = x.extension.dependencyRefs.lesson; x.contentBundle.extra = x.contentBundle.lesson; }, 'COVERAGE_UNBOUND_ARTIFACT'));
test('changed content bytes', () => rejects(x => x.contentBundle.lesson.bytes = Buffer.from('{"id":"bad"}'), 'COVERAGE_DIGEST_MISMATCH'));
test('zero hash', () => rejects(x => { x.checkpoint.contentRefs.lesson.sha256 = '0'.repeat(64); x.extension.dependencyRefs.lesson.sha256 = '0'.repeat(64); }, 'COVERAGE_INVALID_ARTIFACT'));
test('missing bytes', () => rejects(x => delete x.contentBundle.lesson.bytes, 'COVERAGE_INVALID_ARTIFACT'));
test('wrong artifact version', () => rejects(x => x.contentBundle.lesson.version = '9', 'COVERAGE_INVALID_ARTIFACT'));
test('invalid JSON with valid hash', () => rejects(x => { let b = Buffer.from('{bad'); x.contentBundle.lesson.bytes = b; let h = createHash('sha256').update(b).digest('hex'); x.checkpoint.contentRefs.lesson.sha256 = h; x.extension.dependencyRefs.lesson.sha256 = h; }, 'COVERAGE_INVALID_JSON'));
test('lesson id mismatch', () => rejects(x => x.checkpoint.config.lessonId = 'another', 'COVERAGE_LESSON_MISMATCH'));
test('extension reference drift', () => rejects(x => x.extension.dependencyRefs.lesson.version = '2', 'COVERAGE_REFERENCE_DRIFT'));
test('extension executable forbidden', () => rejects(x => x.extension.executable = true, 'COVERAGE_EXTENSION_BINDING'));
test('wrong revision', () => rejects(x => x.extension.checkpointBinding.revision = 3, 'COVERAGE_EXTENSION_BINDING'));
test('fake provenance cannot grant trust', () => { const x = fixture(); x.provenance = { source: 'self-claimed', verified: true, atomic: true }; const r = validate(x); assert.equal(r.provenanceVerified, false); assert.equal(r.atomicSnapshotGuaranteed, false); });
test('lesson null allowed only when no lesson ref and no lessonId', () => { const x = fixture(); delete x.checkpoint.contentRefs.lesson; delete x.extension.dependencyRefs.lesson; delete x.contentBundle.lesson; x.bindings.lesson = null; x.checkpoint.config.lessonId = null; assert.equal(validate(x).artifactCount, 8); });
test('lesson null refused when checkpoint has lesson', () => rejects(x => x.bindings.lesson = null, 'COVERAGE_LESSON_MISMATCH'));
test('extra content bundle key rejected', () => rejects(x => x.contentBundle.other = x.contentBundle.lesson, 'COVERAGE_ARTIFACT_SET'));
