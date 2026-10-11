/** Phase 3.3-C — Restoration Snapshot Extension V1. Node ESM; pure, fail-closed. */
import { createHash } from 'node:crypto';
import {
    validatePendingContentCapture
} from './pendingContentCaptureValidator.js';

export const SNAPSHOT_EXTENSION_INFO = Object.freeze({ schemaVersion: '1.0.0', runtimeVersion: '0.2.0', executable: false, atomicityGuaranteed: false });
export const REQUIRED_DEPENDENCIES = Object.freeze([
    'questionBanks', 'lesson', 'knowledgeMap', 'masteryRules', 'evidenceModel',
    'adaptiveRules', 'adaptivePaths', 'failureSignatures', 'remediationRules'
]);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const str = x => typeof x === 'string' && x.trim().length > 0;
function canonical(x) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (Array.isArray(x)) {
        if (Object.keys(x).length !== x.length || x.some((_, i) => !own(x, i))) fail('SNAPSHOT_NON_JSON');
        return `[${x.map(canonical).join(',')}]`;
    }
    if (!record(x) || Object.getPrototypeOf(x) !== Object.prototype && Object.getPrototypeOf(x) !== null) fail('SNAPSHOT_NON_JSON');
    const keys = Object.keys(x).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`;
}
function copy(x) { return JSON.parse(canonical(x)); }
const digest = x => createHash('sha256').update(canonical(x), 'utf8').digest('hex');
const same = (a, b) => canonical(a) === canonical(b);
function validateBase(checkpoint, snapshot) {
    if (!record(checkpoint) || !record(snapshot) || !record(snapshot.runtime) || !record(checkpoint.runtime)) fail('SNAPSHOT_INVALID_INPUT');
    if (checkpoint.runtime.name !== 'StudySession' || checkpoint.runtime.version !== '0.2.0' || snapshot.runtime.name !== 'StudySession' || snapshot.runtime.version !== '0.2.0' || checkpoint.runtime.status !== 'active') fail('SNAPSHOT_UNSUPPORTED_RUNTIME');
    if (!str(checkpoint.runtime.sessionId) || checkpoint.runtime.sessionId !== snapshot.runtime.sessionId || !Number.isSafeInteger(checkpoint.revision) || checkpoint.revision < 0) fail('SNAPSHOT_IDENTITY_MISMATCH');
    if (!record(snapshot.dependencies) || REQUIRED_DEPENDENCIES.some(k => !own(snapshot.dependencies, k))) fail('SNAPSHOT_MISSING_DEPENDENCIES');
    const fields = ['runtime', 'config', 'state', 'currentDecision', 'currentSelection', 'currentQuestion', 'lessonRuntime', 'activeRemediationPlan', 'history', 'masteryRuntime'];
    for (const field of fields) if (!own(checkpoint, field) || !own(snapshot, field) || !same(checkpoint[field], snapshot[field])) fail('SNAPSHOT_CHECKPOINT_DRIFT');
    if (!Array.isArray(checkpoint.attemptIds) || !Array.isArray(snapshot.attempts) || checkpoint.attemptIds.length !== snapshot.attempts.length || checkpoint.attemptIds.some((id, i) => !str(id) || snapshot.attempts[i]?.attemptId !== id || snapshot.attempts[i]?.sessionId !== checkpoint.runtime.sessionId)) fail('SNAPSHOT_ATTEMPT_DRIFT');
    if (!record(checkpoint.contentRefs)) fail('SNAPSHOT_MISSING_REFS');
    for (const [key, ref] of Object.entries(checkpoint.contentRefs)) if (!record(ref) || !str(ref.id) || !str(ref.version) || !/^[0-9a-f]{64}$/i.test(ref.sha256) || /^0{64}$/.test(ref.sha256)) fail('SNAPSHOT_UNVERIFIED_REFS');
    const hasPendingDelivery =
        checkpoint.currentSelection !== null ||
        checkpoint.currentQuestion !== null ||
        checkpoint.lessonRuntime?.currentItem !== null;

    if (hasPendingDelivery) {
        validatePendingContentCapture(checkpoint);
    }
    if (checkpoint.attemptIds.length && (!record(snapshot.lastFlowResult) || !str(snapshot.lastFlowResult?.adaptiveDecision?.action) || snapshot.lastFlowResult.adaptiveDecision.action !== snapshot.currentDecision?.action)) fail('SNAPSHOT_LAST_FLOW_MISMATCH');
    if (!checkpoint.attemptIds.length && snapshot.lastFlowResult !== null) fail('SNAPSHOT_LAST_FLOW_MISMATCH');
    if (checkpoint.attemptIds.length && (checkpoint.history.at(-1)?.attemptId !== checkpoint.attemptIds.at(-1) || checkpoint.history.at(-1)?.nextAction !== checkpoint.currentDecision?.action)) fail('SNAPSHOT_HISTORY_MISMATCH');
    return fields;
}
/** Capture must receive a genuine live snapshot from getSessionSnapshot(), not createStudySession(). */
export function captureRestorationSnapshotExtension({ checkpoint, liveSnapshot } = {}) {
    validateBase(checkpoint, liveSnapshot);
    const continuity = { lastFlowResult: copy(liveSnapshot.lastFlowResult), lessonPlan: copy(liveSnapshot.lessonRuntime.plan), attempts: copy(liveSnapshot.attempts) };
    const refs = copy(checkpoint.contentRefs);
    const envelope = {
        schemaVersion: SNAPSHOT_EXTENSION_INFO.schemaVersion,
        checkpointBinding: { sessionId: checkpoint.runtime.sessionId, revision: checkpoint.revision, sha256: digest(checkpoint) },
        runtimeVersion: '0.2.0', dependencyRefs: refs, continuity,
        continuitySha256: digest(continuity),
        provenance: { kind: 'live-snapshot-capture', verified: false, atomicityGuaranteed: false },
        executable: false
    };
    return copy(envelope);
}
/** Verify tampering/binding; no proof of external content integrity or atomic persistence. */
export function validateRestorationSnapshotExtension({ checkpoint, extension } = {}) {
    if (!record(checkpoint) || !record(extension) || extension.schemaVersion !== '1.0.0' || extension.runtimeVersion !== '0.2.0') fail('SNAPSHOT_INVALID_EXTENSION');
    if (extension.executable !== false || extension.provenance?.verified !== false || extension.provenance?.atomicityGuaranteed !== false || extension.provenance?.kind !== 'live-snapshot-capture') fail('SNAPSHOT_UNTRUSTED_CLAIM');
    if (extension.checkpointBinding?.sessionId !== checkpoint.runtime?.sessionId || extension.checkpointBinding?.revision !== checkpoint.revision || extension.checkpointBinding?.sha256 !== digest(checkpoint)) fail('SNAPSHOT_BINDING_MISMATCH');
    if (!same(extension.dependencyRefs, checkpoint.contentRefs)) fail('SNAPSHOT_REFERENCE_DRIFT');
    if (!record(extension.continuity) || !Array.isArray(extension.continuity.attempts) || !own(extension.continuity, 'lastFlowResult') || !own(extension.continuity, 'lessonPlan') || digest(extension.continuity) !== extension.continuitySha256) fail('SNAPSHOT_CONTINUITY_TAMPERED');
    if (extension.continuity.attempts.length !== checkpoint.attemptIds?.length || extension.continuity.attempts.some((a, i) => a?.attemptId !== checkpoint.attemptIds[i] || a?.sessionId !== checkpoint.runtime.sessionId)) fail('SNAPSHOT_ATTEMPT_DRIFT');
    if (checkpoint.attemptIds.length && (extension.continuity.lastFlowResult?.adaptiveDecision?.action !== checkpoint.currentDecision?.action || checkpoint.history?.at(-1)?.nextAction !== checkpoint.currentDecision?.action)) fail('SNAPSHOT_LAST_FLOW_MISMATCH');
    if (!checkpoint.attemptIds.length && extension.continuity.lastFlowResult !== null) fail('SNAPSHOT_LAST_FLOW_MISMATCH');
    if (!record(checkpoint.lessonRuntime) || !same(extension.continuity.lessonPlan, checkpoint.lessonRuntime.plan)) fail('SNAPSHOT_PLAN_DRIFT');
    const pending = checkpoint.currentSelection !== null || checkpoint.currentQuestion !== null || checkpoint.lessonRuntime?.currentItem !== null;
    if (pending) validatePendingContentCapture(checkpoint);
    return Object.freeze({ status: 'validated-extension', sessionId: checkpoint.runtime.sessionId, revision: checkpoint.revision, executable: false, contentIntegrityVerified: false, atomicityGuaranteed: false, runtimeContinuityVerified: false });
}
