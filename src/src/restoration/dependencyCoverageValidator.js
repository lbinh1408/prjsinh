/** Phase 3.3-C — Dependency Coverage & Provenance Gate V1. Read-only; NOT executable. */
import { createHash, timingSafeEqual } from 'node:crypto';

export const REQUIRED_RUNTIME_DEPENDENCIES = Object.freeze([
    'questionBanks', 'lesson', 'knowledgeMap', 'masteryRules', 'evidenceModel',
    'adaptiveRules', 'adaptivePaths', 'failureSignatures', 'remediationRules'
]);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const hash = x => typeof x === 'string' && /^[0-9a-f]{64}$/i.test(x) && !/^0{64}$/.test(x);
const clone = x => JSON.parse(JSON.stringify(x));
function keysExactly(object, expected) { return plain(object) && Object.keys(object).length === expected.length && expected.every(k => own(object, k)); }
function digest(bytes) { return createHash('sha256').update(bytes).digest(); }
function sameDigest(a, b) { return timingSafeEqual(a, b); }
/**
 * Binding is an explicit mapping from each runtime dependency to a manifest key,
 * or null ONLY for optional lesson. No implicit key inference or synthetic defaults.
 * Each artifact contains the exact original JSON UTF-8 bytes used by runtime.
 * An untrusted caller's self-reported provenance is never promoted to trust.
 */
export function validateDependencyCoverage({ checkpoint, extension, contentBundle, bindings, provenance } = {}) {
    if (!plain(checkpoint) || !plain(extension) || !plain(checkpoint.contentRefs) || !plain(extension.dependencyRefs)) fail('COVERAGE_INVALID_INPUT');
    if (extension.executable !== false || extension.checkpointBinding?.sessionId !== checkpoint.runtime?.sessionId || extension.checkpointBinding?.revision !== checkpoint.revision) fail('COVERAGE_EXTENSION_BINDING');
    const refs = checkpoint.contentRefs;
    if (!keysExactly(extension.dependencyRefs, Object.keys(refs))) fail('COVERAGE_REFERENCE_DRIFT');
    for (const key of Object.keys(refs)) {
        const a = refs[key], b = extension.dependencyRefs[key];
        if (!plain(a) || !plain(b) || a.id !== b.id || a.version !== b.version || a.sha256 !== b.sha256) fail('COVERAGE_REFERENCE_DRIFT');
    }
    if (!keysExactly(bindings, REQUIRED_RUNTIME_DEPENDENCIES)) fail('COVERAGE_MISSING_BINDING');
    if (!keysExactly(contentBundle, Object.keys(refs))) fail('COVERAGE_ARTIFACT_SET');
    const used = new Set();
    const restored = {};
    for (const dependency of REQUIRED_RUNTIME_DEPENDENCIES) {
        const key = bindings[dependency];
        if (dependency === 'lesson' && key === null) {
            if (checkpoint.config?.lessonId !== null || own(refs, 'lesson')) fail('COVERAGE_LESSON_MISMATCH');
            restored.lesson = null; continue;
        }
        if (typeof key !== 'string' || !own(refs, key) || used.has(key)) fail('COVERAGE_MISSING_BINDING');
        if (key !== dependency) fail('COVERAGE_AMBIGUOUS_BINDING'); // V1 exact names; no aliases
        used.add(key);
        const ref = refs[key], artifact = contentBundle[key];
        if (!plain(ref) || !plain(artifact) || typeof ref.id !== 'string' || !ref.id.trim() || typeof ref.version !== 'string' || !ref.version.trim() || !hash(ref.sha256) || artifact.id !== ref.id || artifact.version !== ref.version || !(artifact.bytes instanceof Uint8Array) || artifact.bytes instanceof Uint8ClampedArray) fail('COVERAGE_INVALID_ARTIFACT');
        if (!sameDigest(digest(artifact.bytes), Buffer.from(ref.sha256, 'hex'))) fail('COVERAGE_DIGEST_MISMATCH');
        let value;
        try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            const raw = decoder.decode(artifact.bytes);
            value = JSON.parse(raw);
            if (Buffer.from(raw, 'utf8').length !== artifact.bytes.length) fail('COVERAGE_ENCODING_MISMATCH');
        } catch (e) { if (e.code === 'COVERAGE_ENCODING_MISMATCH') throw e; fail('COVERAGE_INVALID_JSON'); }
        if (!plain(value) && !Array.isArray(value)) fail('COVERAGE_INVALID_JSON');
        restored[dependency] = value;
    }
    if (used.size !== Object.keys(refs).length) fail('COVERAGE_UNBOUND_ARTIFACT');
    if (checkpoint.config?.lessonId !== null && restored.lesson?.id !== checkpoint.config?.lessonId) fail('COVERAGE_LESSON_MISMATCH');
    // Provenance is advisory. A receipt from the same caller is NOT an authority.
    if (provenance !== undefined && (!plain(provenance) || typeof provenance.source !== 'string')) fail('COVERAGE_INVALID_PROVENANCE');
    return Object.freeze({ status: 'dependency-bytes-validated', sessionId: checkpoint.runtime.sessionId, revision: checkpoint.revision, dependencyCount: REQUIRED_RUNTIME_DEPENDENCIES.length, artifactCount: used.size, contentBytesVerified: true, dependencyCoverageVerified: true, provenanceVerified: false, atomicSnapshotGuaranteed: false, runtimeContinuityVerified: false, executable: false });
}
