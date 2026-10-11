/** Phase 3.3-C — Guarded Reconstruction V1. Never returns an executable session. */
import { createHash } from 'node:crypto';
import { validateRestorationSnapshotExtension } from './restorationSnapshotExtension.js';
import { validateDependencyCoverage, REQUIRED_RUNTIME_DEPENDENCIES } from './dependencyCoverageValidator.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const fail = code => { const e = new Error(code); e.code = code; throw e; };
function canonical(x) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (Array.isArray(x)) { if (Object.keys(x).length !== x.length || x.some((_, i) => !own(x, i))) fail('RECON_NON_JSON'); return '[' + x.map(canonical).join(',') + ']'; }
    if (!plain(x)) fail('RECON_NON_JSON'); return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
}
const clone = x => JSON.parse(canonical(x));
const sha = x => createHash('sha256').update(canonical(x), 'utf8').digest('hex');
const FIELDS = ['runtime', 'config', 'state', 'currentDecision', 'currentSelection', 'currentQuestion', 'activeRemediationPlan', 'history', 'masteryRuntime'];
/**
 * Input is a complete atomic-record envelope plus verified content bytes.
 * No trust is inferred from caller-provided provenance, store receipt or matching SHA alone.
 * The output candidate MUST NOT be passed to StudySession public APIs as an executable session.
 */
export function reconstructGuardedStudySession({ envelope, contentBundle, bindings } = {}) {
    if (!plain(envelope) || envelope.schemaVersion !== '1.0.0' || envelope.executable !== false || !plain(envelope.checkpoint) || !plain(envelope.extension) || !plain(envelope.binding)) fail('RECON_INVALID_ENVELOPE');
    const cp = envelope.checkpoint, ext = envelope.extension;
    if (envelope.binding.sessionId !== cp.runtime?.sessionId || envelope.binding.revision !== cp.revision || envelope.binding.checkpointSha256 !== sha(cp) || envelope.binding.extensionSha256 !== sha(ext)) fail('RECON_BINDING_MISMATCH');
    validateRestorationSnapshotExtension({ checkpoint: cp, extension: ext });
    const coverage = validateDependencyCoverage({ checkpoint: cp, extension: ext, contentBundle, bindings });
    if (coverage.contentBytesVerified !== true || coverage.dependencyCoverageVerified !== true || coverage.executable !== false) fail('RECON_COVERAGE_NOT_VERIFIED');
    const dependencies = {};
    for (const name of REQUIRED_RUNTIME_DEPENDENCIES) {
        const key = bindings[name];
        if (key === null) { dependencies[name] = null; continue; }
        const bytes = contentBundle[key].bytes;
        let value;
        try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail('RECON_CONTENT_PARSE'); }
        dependencies[name] = clone(value);
    }
    const candidate = {};
    for (const field of FIELDS) { if (!own(cp, field)) fail('RECON_MISSING_FIELD'); candidate[field] = clone(cp[field]); }
    if (!plain(cp.lessonRuntime) || !plain(ext.continuity)) fail('RECON_MISSING_CONTINUITY');
    candidate.lessonRuntime = { ...clone(cp.lessonRuntime), plan: clone(ext.continuity.lessonPlan) };
    candidate.dependencies = dependencies;
    candidate.attempts = clone(ext.continuity.attempts);
    candidate.lastFlowResult = clone(ext.continuity.lastFlowResult);
    const allowed = [...FIELDS, 'lessonRuntime', 'dependencies', 'attempts', 'lastFlowResult'];
    if (Object.keys(candidate).length !== allowed.length) fail('RECON_FIELD_MISMATCH');
    return Object.freeze({ status: 'guarded-candidate', sessionId: cp.runtime.sessionId, revision: cp.revision, candidate: clone(candidate), candidateSha256: sha(candidate), contentBytesVerified: true, dependencyCoverageVerified: true, externalProvenanceVerified: false, atomicCaptureProven: false, runtimeContinuityVerified: false, executable: false });
}
/** Compare all structural fields with an actual getSessionSnapshot() output. Not a behavioral proof. */
export function compareGuardedCandidateToLive({ guarded, liveSnapshot } = {}) {
    if (!plain(guarded) || guarded.status !== 'guarded-candidate' || guarded.executable !== false || !plain(liveSnapshot)) fail('RECON_INVALID_COMPARISON');
    const candidate = guarded.candidate;
    const fields = [...FIELDS, 'lessonRuntime', 'dependencies', 'attempts', 'lastFlowResult'];
    const mismatches = fields.filter(k => !own(liveSnapshot, k) || canonical(candidate[k]) !== canonical(liveSnapshot[k]));
    const extras = Object.keys(liveSnapshot).filter(k => !fields.includes(k));
    return Object.freeze({ status: 'structural-comparison', equal: mismatches.length === 0 && extras.length === 0, mismatches, unexpectedLiveFields: extras, behavioralEquivalenceProven: false, executable: false });
}
