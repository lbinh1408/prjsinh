/** DRAFT: fresh-process, cooperative, synchronous multi-turn only. Not a recovery protocol. */
import { isDeepStrictEqual } from 'node:util';
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1
} from '../engines/orchestration/remediationStopFingerprint.js';
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const copy = v => structuredClone(v);
const CAPTURE_FIELDS = ['stopKind', 'stopFingerprint', 'targetNodeId', 'triggerAttemptId', 'generationInputs'];
const INPUT_FIELDS = ['resolverVersion', 'targetNodeId', 'bankIdentity', 'questionBank', 'selectorConstraints', 'config', 'generationRules'];
const RULE_FIELDS = ['adaptiveRules', 'adaptivePaths', 'knowledgeMap', 'failureSignatures', 'remediationRules'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
function deeplyFrozen(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object') return true;
    if (!Object.isFrozen(value) || seen.has(value)) return false;
    seen.add(value);
    return Object.values(value).every(child => deeplyFrozen(child, seen));
}
function validateRemediationStopCapture({ capture, result, attemptId, sessionId, consumed }) {
    if (!Object.hasOwn(result, 'remediationStopCapture')) return null;
    if (!isRecord(capture) || Object.keys(capture).length !== CAPTURE_FIELDS.length ||
        CAPTURE_FIELDS.some(field => !Object.hasOwn(capture, field)) ||
        Object.keys(capture).some(field => !CAPTURE_FIELDS.includes(field)) ||
        !deeplyFrozen(capture)) {
        fail('K283_MULTI_REMEDIATION_CAPTURE_INVALID');
    }
    if (consumed.has(capture)) fail('K283_MULTI_REMEDIATION_CAPTURE_REUSED');
    const { stopKind, stopFingerprint, targetNodeId, triggerAttemptId, generationInputs } = capture;
    const flowGeneration = result.flowResult?.remediationGeneration;
    const stopField = stopKind === 'INFEASIBLE'
        ? 'remediationGenerationStop'
        : stopKind === 'POLICY_ERROR'
            ? 'remediationPolicyErrorStop'
            : null;
    const stop = stopField ? result.session?.extensions?.[stopField] : null;
    if (!stopField || !/^[a-f0-9]{64}$/i.test(stopFingerprint) ||
        typeof targetNodeId !== 'string' || !targetNodeId.trim() ||
        triggerAttemptId !== attemptId || result.attempt?.attemptId !== attemptId ||
        result.attempt?.sessionId !== sessionId ||
        result.session?.runtime?.sessionId !== sessionId ||
        flowGeneration?.status !== stopKind ||
        flowGeneration?.targetNodeId !== targetNodeId ||
        flowGeneration?.triggerAttemptId !== attemptId ||
        stop?.status !== stopKind || stop?.triggerAttemptId !== attemptId ||
        stop?.targetNodeId !== targetNodeId || stop?.configFingerprint !== stopFingerprint ||
        Object.hasOwn(result.session.extensions ?? {}, stopKind === 'INFEASIBLE'
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
        fail('K283_MULTI_REMEDIATION_CAPTURE_BINDING_MISMATCH');
    }
    let digest;
    try {
        digest = stopKind === 'INFEASIBLE'
            ? computeLegacyInfeasibleFingerprintV1(generationInputs)
            : computePolicyErrorFingerprintV1(generationInputs);
    } catch {
        fail('K283_MULTI_REMEDIATION_CAPTURE_INVALID');
    }
    if (digest !== stopFingerprint) fail('K283_MULTI_REMEDIATION_CAPTURE_DIGEST_MISMATCH');
    consumed.add(capture);
    return capture;
}

export function createK283PersistentMultiTurnCoordinatorV1({
    sessionId, authority, coordination, attemptStore, journal, durableCommit,
    contentRefs, select, submit, now = () => new Date().toISOString()
} = {}) {
    if (!sessionId || !authority?.inspect || !authority?.mutate || !coordination?.withWriter ||
        !attemptStore?.appendAttempt || !attemptStore?.getAttempt || !attemptStore?.listAttemptIds ||
        !journal?.prepare || !journal?.markUnknown || !journal?.reconcile || !journal?.read ||
        !durableCommit?.commit || !durableCommit?.read || !durableCommit?.audit ||
        typeof select !== 'function' || typeof submit !== 'function' || !contentRefs) fail('K283_MULTI_INVALID_OPTIONS');
    const initial = authority.inspect();
    if (initial.sessionId !== sessionId || initial.revision !== 0 ||
        journal.read(sessionId) !== null || durableCommit.read({ sessionId }) !== null ||
        attemptStore.listAttemptIds({ sessionId }).length !== 0) fail('K283_MULTI_EXISTING_DATA_BLOCKED');
    let completed = 0, checkpointRevision = 0, poisoned = false, awaitingSubmit = false;
    const consumedCaptures = new WeakSet();
    const inspect = () => Object.freeze({
        completed, checkpointRevision, revision: authority.inspect().revision,
        awaitingSubmit, poisoned, resumeAuthorized: false, retryAuthorized: false, crossStoreAtomicityProven: false
    });
    function guarded(write) {
        if (poisoned) fail('K283_MULTI_POISONED');
        try { return coordination.withWriter({ sessionId, write }); }
        catch (e) { poisoned = true; throw e; }
    }
    function checkDurable() {
        const entries = journal.read(sessionId)?.entries ?? [];
        const ids = attemptStore.listAttemptIds({ sessionId });
        const checkpoint = durableCommit.read({ sessionId });
        if (entries.length !== completed || ids.length !== completed ||
            entries.some((e, i) => e.state !== 'COMMITTED' || e.attemptId !== ids[i]) ||
            (completed === 0 ? checkpoint !== null : !checkpoint ||
                checkpoint.checkpointRevision !== checkpointRevision ||
                checkpoint.authorityRevision !== authority.inspect().revision ||
                !isDeepStrictEqual(checkpoint.checkpoint.attemptIds, ids))) fail('K283_MULTI_DURABLE_DRIFT');
        if (completed > 0) {
            const audit = durableCommit.audit({ sessionId }); // MUTATES journal: under outer writer lock.
            if (audit.status !== 'CHECKPOINT_MATCHED') fail('K283_MULTI_AUDIT_FAILED');
        }
    }
    function selectNext() {
        if (awaitingSubmit) fail('K283_MULTI_SELECTION_PENDING');
        return guarded(() => {
            checkDurable();
            const before = authority.inspect();
            const next = select({ session: copy(before.session), now: now() });
            if (!next?.session || next.session.runtime?.sessionId !== sessionId ||
                !next.selection || !isDeepStrictEqual(authority.inspect(), before)) fail('K283_MULTI_INVALID_SELECTION');
            // Selection is an in-memory revision. Not a durable attempt or checkpoint.
            authority.mutate({ expectedRevision: before.revision, apply: () => copy(next.session) });
            awaitingSubmit = next.selection.status === 'SELECTED';
            return { ...next, revision: authority.inspect().revision };
        });
    }
    function submitSelected({ attemptId, args = {} } = {}) {
        if (!awaitingSubmit) fail('K283_MULTI_NO_SELECTION');
        return guarded(() => {
            const before = authority.inspect();
            if (before.session.currentSelection?.status !== 'SELECTED' || !before.session.currentQuestion ||
                typeof attemptId !== 'string' || !attemptId || attemptStore.getAttempt({ sessionId, attemptId }) !== null)
                fail('K283_MULTI_INVALID_SUBMIT');
            // Previous checkpoint is at the pre-selection revision; selection itself is not persisted.
            const prior = durableCommit.read({ sessionId });
            if (completed && (!prior || prior.checkpointRevision !== checkpointRevision ||
                prior.authorityRevision !== before.revision - 1)) fail('K283_MULTI_CHECKPOINT_DRIFT');
            const ids = attemptStore.listAttemptIds({ sessionId });
            if (ids.length !== completed || (journal.read(sessionId)?.entries.length ?? 0) !== completed)
                fail('K283_MULTI_SEQUENCE_DRIFT');
            const result = submit({ ...copy(args), session: copy(before.session), attemptId });
            if (!result?.session || !result?.attempt || result.attempt.attemptId !== attemptId ||
                result.attempt.sessionId !== sessionId || result.session.runtime?.sessionId !== sessionId ||
                !isDeepStrictEqual(authority.inspect(), before)) fail('K283_MULTI_INVALID_RESULT');
            const remediationStopCapture = validateRemediationStopCapture({
                capture: result.remediationStopCapture,
                result,
                attemptId,
                sessionId,
                consumed: consumedCaptures
            });
            journal.prepare({ sessionId, attempt: copy(result.attempt), expectedRevision: before.revision });
            journal.markUnknown({ sessionId, attemptId });
            attemptStore.appendAttempt({ sessionId, attempt: copy(result.attempt) });
            const reconciled = journal.reconcile({ sessionId, attemptId });
            if (reconciled.status !== 'COMMITTED' || reconciled.verification !== 'ATTEMPT_MATCHED' ||
                reconciled.externalAttemptCommitVerified !== true) fail('K283_MULTI_ATTEMPT_UNVERIFIED');
            authority.mutate({ expectedRevision: before.revision, apply: () => copy(result.session) });
            const revision = authority.inspect().revision;
            const saved = durableCommit.commit({
                authority, sessionId, expectedAuthorityRevision: revision,
                expectedCheckpointRevision: checkpointRevision, contentRefs: copy(contentRefs), savedAt: now(),
                ...(remediationStopCapture ? { remediationStopCapture } : {})
            });
            const observed = durableCommit.read({ sessionId });
            if (!saved?.durableCheckpointObserved || !observed ||
                observed.sha256 !== saved.sha256 || observed.checkpointRevision !== checkpointRevision + 1 ||
                observed.authorityRevision !== revision || observed.checkpoint.attemptIds.at(-1) !== attemptId)
                fail('K283_MULTI_CHECKPOINT_UNVERIFIED');
            const audit = durableCommit.audit({ sessionId }); // Mutating audit, held under writer lock.
            if (audit.status !== 'CHECKPOINT_MATCHED' || audit.authorityRevision !== revision)
                fail('K283_MULTI_AUDIT_FAILED');
            completed++; checkpointRevision++; awaitingSubmit = false;
            return {
                result, revision, checkpointRevision, status: 'CHECKPOINT_OBSERVED',
                resumeAuthorized: false, retryAuthorized: false, crossStoreAtomicityProven: false
            };
        });
    }
    return Object.freeze({ selectNext, submitSelected, inspect });
}
