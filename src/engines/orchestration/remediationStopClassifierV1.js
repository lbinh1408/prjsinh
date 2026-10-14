import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateCheckpoint } from '../../persistence/checkpointCodec.js';
import { computeLegacyInfeasibleFingerprintV1, computePolicyErrorFingerprintV1 } from './remediationStopFingerprint.js';
import { createRemediationStopProvenance, verifyRemediationStopProvenance } from './remediationStopProvenance.js';
import { resolveProbeAuthoringPolicy } from '../remediation/probeAuthoringPolicyResolver.js';

const reject = reason => { throw new Error(reason); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
// The existing wrapper checksum serialization, not a remediation fingerprint algorithm.
function canonical(value, seen = new Set()) {
    if (value === null || ['string', 'boolean'].includes(typeof value)) return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
    if (!value || typeof value !== 'object' || seen.has(value) || Object.getOwnPropertySymbols(value).length ||
        (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))) reject('INVALID_JSON');
    seen.add(value);
    try {
        for (const key of Object.getOwnPropertyNames(value)) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!Object.hasOwn(descriptor, 'value')) reject('INVALID_JSON');
        }
        if (Array.isArray(value)) {
            if (Object.keys(value).length !== value.length) reject('INVALID_JSON');
            for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) reject('INVALID_JSON');
            return '[' + value.map(item => canonical(item, seen)).join(',') + ']';
        }
        return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key], seen)).join(',') + '}';
    } finally { seen.delete(value); }
}
function canonicalPolicy(inputs) {
    const policy = inputs.policy;
    const signature = Object.keys(policy?.failureSignatureDefaults ?? {}).sort()[0];
    const resolved = resolveProbeAuthoringPolicy({ policy, targetNodeId: inputs.targetNodeId, failureSignature: signature });
    if (resolved.status !== 'RESOLVED' || !isDeepStrictEqual(resolved.canonicalPolicy, policy)) reject('POLICY_NOT_CANONICAL');
}
const result = (status, reasonCode, fingerprints = {}) => Object.freeze({
    status, reasonCode, ...fingerprints, retryAuthorized: false, resumeAuthorized: false,
    remediationGenerationAuthorized: false, migrationAuthorized: false, executable: false
});

/** Pure informational V1 fingerprint comparison; no runtime integration.
 * comparisonSemantics must be exactly { fingerprintContract: 'V1', stopKind, participation: null }.
 * INFEASIBLE compares only historical V1 fields, making no policy/participation claim.
 * POLICY_ERROR requires valid, already canonical policies on both sides; raw invalid
 * historical policy snapshots fail closed, even when their V1 digest is reproducible.
 * VERIFIED is trusted only within the existing local-storage/caller boundary. Binding
 * checks prove snapshot consistency, not authenticity, freshness, or retry permission.
 */
export function classifyRemediationStopV1(request = {}) {
    try {
        const { checkpoint, remediationProvenance, currentGenerationInputs, comparisonSemantics } = request;
        canonical(comparisonSemantics);
        if (!exact(comparisonSemantics, ['fingerprintContract', 'stopKind', 'participation']) ||
            comparisonSemantics.fingerprintContract !== 'V1' || comparisonSemantics.participation !== null ||
            !['INFEASIBLE', 'POLICY_ERROR'].includes(comparisonSemantics.stopKind)) reject('UNSUPPORTED_COMPARISON_SEMANTICS');
        canonical(remediationProvenance);
        if (!exact(remediationProvenance, ['status', 'source', 'provenance']) || remediationProvenance.status !== 'VERIFIED')
            reject('VERIFIED_PROVENANCE_REQUIRED');
        const { source, provenance } = remediationProvenance;
        if (!exact(source, ['sessionId', 'checkpointRevision', 'checkpointPayloadSha256'])) reject('SOURCE_BINDING_INVALID');
        const payload = canonical(checkpoint);
        validateCheckpoint(checkpoint);
        if (source.sessionId !== checkpoint.runtime.sessionId || source.checkpointRevision !== checkpoint.revision ||
            source.checkpointPayloadSha256 !== createHash('sha256').update(payload).digest('hex')) reject('SOURCE_BINDING_INVALID');
        const kind = comparisonSemantics.stopKind;
        const stop = checkpoint.extensions?.[kind === 'INFEASIBLE' ? 'remediationGenerationStop' : 'remediationPolicyErrorStop'];
        if (!stop || !checkpoint.attemptIds.includes(stop.triggerAttemptId) || provenance?.fingerprintContract !== 'V1' ||
            provenance.participation !== null) reject('STOP_BINDING_INVALID');
        verifyRemediationStopProvenance({ provenance, sessionId: source.sessionId, checkpointRevision: source.checkpointRevision,
            checkpointPayloadSha256: source.checkpointPayloadSha256, stopKind: kind, stopFingerprint: stop.configFingerprint });
        const historical = provenance.generationInputs;
        if (historical.targetNodeId !== stop.targetNodeId || historical.bankIdentity.bankId !== stop.bankId ||
            historical.bankIdentity.version !== stop.bankVersion || (kind === 'POLICY_ERROR' &&
                (historical.policy.policyId !== stop.policyId || historical.policy.policyVersion !== stop.policyVersion))) reject('STOP_BINDING_INVALID');
        canonical(currentGenerationInputs);
        if (currentGenerationInputs.targetNodeId !== stop.targetNodeId ||
            currentGenerationInputs.resolverVersion !== historical.resolverVersion) reject('INCOMPARABLE_INPUTS');
        const compute = kind === 'INFEASIBLE' ? computeLegacyInfeasibleFingerprintV1 : computePolicyErrorFingerprintV1;
        const currentFingerprint = compute(currentGenerationInputs);
        // Reuse the encoder's exact input validation for the independent current snapshot.
        // This ephemeral value is never persisted or used as historical evidence.
        createRemediationStopProvenance({ sessionId: source.sessionId, checkpointRevision: source.checkpointRevision,
            checkpointPayloadSha256: source.checkpointPayloadSha256, stopKind: kind, stopFingerprint: currentFingerprint,
            fingerprintContract: 'V1', participation: null, generationInputs: currentGenerationInputs });
        if (kind === 'POLICY_ERROR') { canonicalPolicy(historical); canonicalPolicy(currentGenerationInputs); }
        const matches = currentFingerprint === provenance.stopFingerprint;
        return result(matches ? 'CURRENT_MATCH' : 'RETRY_ELIGIBLE', matches ? 'V1_FINGERPRINT_MATCH' : 'V1_FINGERPRINT_CHANGED',
            { historicalFingerprint: provenance.stopFingerprint, currentFingerprint });
    } catch {
        return result('FAIL_CLOSED', 'INVALID_OR_UNSUPPORTED_COMPARISON');
    }
}
