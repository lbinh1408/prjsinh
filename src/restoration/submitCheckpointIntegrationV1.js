import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1
} from '../engines/orchestration/remediationStopFingerprint.js';
import { isDeepStrictEqual } from 'node:util';
/** Submit + Durable Checkpoint Integration V1 — DRAFT.
 * Cooperative, synchronous, fresh-session orchestration only.
 * No durable session hydration, crash recovery, automatic retry or atomicity claim.
 * A failure poisons this instance permanently, including errors before a disk write.
 */
const fail = code => { const error = new Error(code); error.code = code; throw error; };
const validRevision = n => Number.isSafeInteger(n) && n >= 0;
const isPromise = v => v != null && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';
const clone = v => structuredClone(v);
const CAPTURE_FIELDS = ['stopKind', 'stopFingerprint', 'targetNodeId', 'triggerAttemptId', 'generationInputs'];
const INPUT_FIELDS = ['resolverVersion', 'targetNodeId', 'bankIdentity', 'questionBank', 'selectorConstraints', 'config', 'generationRules'];
const RULE_FIELDS = ['adaptiveRules', 'adaptivePaths', 'knowledgeMap', 'failureSignatures', 'remediationRules'];
const flags = Object.freeze({
    durableSessionCommitProven: false, crossStoreAtomicityProven: false,
    resumeAuthorized: false, retryAuthorized: false, executable: false
});
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
function deeplyFrozen(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object') return true;
    if (!Object.isFrozen(value) || seen.has(value)) return false;
    seen.add(value);
    return Object.values(value).every(child => deeplyFrozen(child, seen));
}
function validateRemediationStopCapture({ capture, session, attemptId, sessionId, consumed }) {
    if (!isRecord(capture) || Object.keys(capture).length !== CAPTURE_FIELDS.length ||
        CAPTURE_FIELDS.some(field => !Object.hasOwn(capture, field)) ||
        Object.keys(capture).some(field => !CAPTURE_FIELDS.includes(field)) ||
        !deeplyFrozen(capture)) {
        fail('SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_INVALID');
    }
    if (consumed.has(capture)) fail('SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_REUSED');
    const { stopKind, stopFingerprint, targetNodeId, triggerAttemptId, generationInputs } = capture;
    const stopField = stopKind === 'INFEASIBLE'
        ? 'remediationGenerationStop'
        : stopKind === 'POLICY_ERROR'
            ? 'remediationPolicyErrorStop'
            : null;
    const stop = stopField ? session?.extensions?.[stopField] : null;
    const attempt = session?.attempts?.at(-1);
    if (!stopField || !/^[a-f0-9]{64}$/i.test(stopFingerprint) ||
        typeof targetNodeId !== 'string' || !targetNodeId.trim() ||
        triggerAttemptId !== attemptId || attempt?.attemptId !== attemptId ||
        attempt?.sessionId !== sessionId || session?.runtime?.sessionId !== sessionId ||
        stop?.status !== stopKind || stop?.triggerAttemptId !== attemptId ||
        stop?.targetNodeId !== targetNodeId || stop?.configFingerprint !== stopFingerprint ||
        Object.hasOwn(session.extensions ?? {}, stopKind === 'INFEASIBLE'
            ? 'remediationPolicyErrorStop'
            : 'remediationGenerationStop') ||
        !isRecord(generationInputs) ||
        !isDeepStrictEqual(Object.keys(generationInputs).sort(), [
            ...INPUT_FIELDS,
            ...(stopKind === 'POLICY_ERROR' ? ['policy'] : [])
        ].sort()) ||
        generationInputs.targetNodeId !== targetNodeId ||
        !isRecord(generationInputs.bankIdentity) ||
        generationInputs.bankIdentity.bankId !== stop.bankId ||
        generationInputs.bankIdentity.version !== stop.bankVersion ||
        generationInputs.questionBank?.bankId !== stop.bankId ||
        generationInputs.questionBank?.version !== stop.bankVersion ||
        generationInputs.questionBank?.primaryNode !== targetNodeId ||
        !isRecord(generationInputs.generationRules) ||
        !isDeepStrictEqual(Object.keys(generationInputs.generationRules).sort(), [...RULE_FIELDS].sort()) ||
        (stopKind === 'POLICY_ERROR' &&
            (generationInputs.policy?.policyId !== stop.policyId ||
                generationInputs.policy?.policyVersion !== stop.policyVersion))) {
        fail('SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_BINDING_MISMATCH');
    }
    let digest;
    try {
        digest = stopKind === 'INFEASIBLE'
            ? computeLegacyInfeasibleFingerprintV1(generationInputs)
            : computePolicyErrorFingerprintV1(generationInputs);
    } catch {
        fail('SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_INVALID');
    }
    if (digest !== stopFingerprint) fail('SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_DIGEST_MISMATCH');
    consumed.add(capture);
    return capture;
}

export function createSubmitCheckpointIntegrationV1({
    integration, authority, durableCommit, journal, contentRefs, now = () => new Date().toISOString()
} = {}) {
    if (!integration || typeof integration.submitOnce !== 'function' || typeof integration.inspect !== 'function' ||
        typeof authority?.inspect !== 'function' || typeof durableCommit?.commit !== 'function' ||
        typeof durableCommit?.read !== 'function' || typeof durableCommit?.audit !== 'function' ||
        typeof journal?.read !== 'function' || !contentRefs || typeof contentRefs !== 'object' ||
        Array.isArray(contentRefs) || typeof now !== 'function') fail('SUBMIT_CHECKPOINT_INVALID_OPTIONS');
    const initial = authority.inspect();
    const sessionId = initial.sessionId;
    if (typeof sessionId !== 'string' || !sessionId || initial.session?.runtime?.sessionId !== sessionId ||
        !validRevision(initial.revision)) fail('SUBMIT_CHECKPOINT_INVALID_SESSION');
    // This adapter deliberately does not adopt existing durable records. Reopening after restart
    // requires a separately designed recovery proof and is NOT authorized by this module.
    if (journal.read(sessionId) !== null || durableCommit.read({ sessionId }) !== null)
        fail('SUBMIT_CHECKPOINT_EXISTING_DATA_BLOCKED');
    if (integration.inspect().phase !== 'IDLE') fail('SUBMIT_CHECKPOINT_INTEGRATION_NOT_IDLE');
    let phase = 'IDLE', completed = 0, checkpointRevision = 0, ownedRevision = initial.revision;
    let pendingAttemptId = null;
    const consumedCaptures = new WeakSet();
    function inspect() {
        return Object.freeze({ phase, completed, checkpointRevision, ownedRevision, pendingAttemptId, ...flags });
    }
    function checkBefore(expectedRevision) {
        if (phase !== 'IDLE') fail('SUBMIT_CHECKPOINT_SUBMIT_BLOCKED');
        const current = authority.inspect();
        if (current.sessionId !== sessionId || current.revision !== ownedRevision ||
            current.session?.runtime?.sessionId !== sessionId) fail('SUBMIT_CHECKPOINT_AUTHORITY_DRIFT');
        if (expectedRevision !== ownedRevision) fail('SUBMIT_CHECKPOINT_REVISION_CONFLICT');
        const upstream = integration.inspect();
        if (upstream.phase !== 'IDLE' || upstream.completed !== completed || upstream.ownedRevision !== ownedRevision)
            fail('SUBMIT_CHECKPOINT_INTEGRATION_DRIFT');
        const journalRecord = journal.read(sessionId);
        if ((journalRecord?.entries?.length ?? 0) !== completed ||
            (completed && journalRecord.entries.at(-1).state !== 'COMMITTED')) fail('SUBMIT_CHECKPOINT_JOURNAL_DRIFT');
        const saved = durableCommit.read({ sessionId });
        if (completed === 0) {
            if (saved !== null) fail('SUBMIT_CHECKPOINT_CHECKPOINT_DRIFT');
        } else {
            if (!saved || saved.checkpointRevision !== checkpointRevision ||
                saved.authorityRevision !== ownedRevision ||
                saved.checkpoint?.attemptIds?.length !== completed) fail('SUBMIT_CHECKPOINT_CHECKPOINT_DRIFT');
            const audit = durableCommit.audit({ sessionId });
            if (isPromise(audit) || audit.status !== 'CHECKPOINT_MATCHED' ||
                audit.checkpointRevision !== checkpointRevision || audit.authorityRevision !== ownedRevision)
                fail('SUBMIT_CHECKPOINT_AUDIT_FAILED');
        }
    }
    function submitOnce({ expectedRevision, attemptId, args = {} } = {}) {
        checkBefore(expectedRevision);
        // Any attempted submit that fails, even before persistence, poisons the coordinator.
        phase = 'SUBMITTING'; pendingAttemptId = attemptId ?? null;
        try {
            const result = integration.submitOnce({ expectedRevision, attemptId, args });
            if (isPromise(result) || result?.status !== 'COMMITTED' || result.attemptId !== attemptId ||
                result.revision !== expectedRevision + 1 ||
                result.attemptStoreVerifiedBeforeSessionMutation !== true)
                fail('SUBMIT_CHECKPOINT_UPSTREAM_UNVERIFIED');
            let remediationStopCapture = null;
            if (Object.hasOwn(result, 'remediationStopCapture')) {
                if (result.remediationStopCapture === undefined ||
                    result.remediationStopCapture === null) {
                    fail('SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_INVALID');
                }
                remediationStopCapture = validateRemediationStopCapture({
                    capture: result.remediationStopCapture,
                    session: authority.inspect().session,
                    attemptId,
                    sessionId,
                    consumed: consumedCaptures
                });
            }
            phase = 'CHECKPOINT_COMMIT_UNKNOWN';
            const current = authority.inspect();
            if (current.sessionId !== sessionId || current.revision !== result.revision)
                fail('SUBMIT_CHECKPOINT_AUTHORITY_DRIFT');
            const savedAt = now();
            if (isPromise(savedAt) || typeof savedAt !== 'string' || !Number.isFinite(Date.parse(savedAt)))
                fail('SUBMIT_CHECKPOINT_INVALID_TIMESTAMP');
            const committed = durableCommit.commit({
                authority, sessionId, expectedAuthorityRevision: result.revision,
                expectedCheckpointRevision: checkpointRevision, contentRefs: clone(contentRefs), savedAt,
                ...(remediationStopCapture ? { remediationStopCapture } : {})
            });
            if (isPromise(committed) || committed?.checkpointRevision !== checkpointRevision + 1 ||
                committed.authorityRevision !== result.revision || committed.durableCheckpointObserved !== true)
                fail('SUBMIT_CHECKPOINT_COMMIT_UNVERIFIED');
            const observed = durableCommit.read({ sessionId });
            if (isPromise(observed) || !observed || observed.sha256 !== committed.sha256 ||
                observed.checkpointRevision !== committed.checkpointRevision ||
                observed.authorityRevision !== result.revision ||
                observed.checkpoint?.attemptIds?.at(-1) !== attemptId)
                fail('SUBMIT_CHECKPOINT_READBACK_MISMATCH');
            const audit = durableCommit.audit({ sessionId });
            if (isPromise(audit) || audit?.status !== 'CHECKPOINT_MATCHED' ||
                audit.checkpointRevision !== committed.checkpointRevision ||
                audit.authorityRevision !== result.revision) fail('SUBMIT_CHECKPOINT_AUDIT_FAILED');
            if (authority.inspect().revision !== result.revision) fail('SUBMIT_CHECKPOINT_AUTHORITY_DRIFT');
            ownedRevision = result.revision;
            checkpointRevision = committed.checkpointRevision;
            completed++;
            phase = 'IDLE'; pendingAttemptId = null;
            return Object.freeze({
                status: 'CHECKPOINT_OBSERVED', attemptId, revision: ownedRevision,
                checkpointRevision, durableCheckpointObserved: true, ...flags
            });
        } catch (error) {
            phase = 'COMMIT_UNKNOWN';
            throw error;
        }
    }
    function audit({ sessionId: requestedId } = {}) {
        if (requestedId !== undefined && requestedId !== sessionId) fail('SUBMIT_CHECKPOINT_SESSION_CONFLICT');
        const result = durableCommit.audit({ sessionId });
        if (isPromise(result)) fail('SUBMIT_CHECKPOINT_ASYNC_UNSUPPORTED');
        return Object.freeze({ ...result, ...flags });
    }
    return Object.freeze({ submitOnce, inspect, audit });
}
