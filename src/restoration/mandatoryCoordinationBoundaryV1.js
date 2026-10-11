/** Phase 3.3-E DRAFT: opt-in composition boundary, not global enforcement.
 * Wrap the OUTERMOST public entry point once; never wrap nested store calls.
 * All writers sharing these roots MUST participate in the same coordinator.
 */
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const isPromise = x => x != null && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
const validId = x => typeof x === 'string' && x.trim() === x && x.length > 0 && x.length <= 256;
const FLAGS = Object.freeze({ resumeAuthorized: false, retryAuthorized: false, executable: false, crossStoreAtomicityProven: false });
export function createMandatoryCoordinationBoundaryV1({ coordination, sessionId, integration, methods = ['submitOnce', 'reconcile', 'audit'] } = {}) {
  if (!validId(sessionId) || typeof coordination?.withWriter !== 'function' || !integration ||
      !Array.isArray(methods) || methods.length === 0 ||
      methods.some(m => typeof m !== 'string' || !['submitOnce','reconcile','audit','persistSession'].includes(m) || typeof integration[m] !== 'function'))
    fail('COORDINATION_BOUNDARY_INVALID_INPUT');
  const result = {};
  for (const method of methods) {
    result[method] = (...args) => {
      // Reject wrong-session requests before obtaining lock; don't silently retarget them.
      const input = args[0];
      if (input && typeof input === 'object' && 'sessionId' in input && input.sessionId !== undefined && input.sessionId !== sessionId)
        fail('COORDINATION_BOUNDARY_SESSION_CONFLICT');
      const output = coordination.withWriter({ sessionId, write: () => {
        const value = integration[method](...args);
        if (isPromise(value)) fail('COORDINATION_BOUNDARY_ASYNC_UNSUPPORTED');
        return value;
      }});
      if (isPromise(output)) fail('COORDINATION_BOUNDARY_ASYNC_UNSUPPORTED');
      // Preserve original result contract. Do not claim the result is a recovery permit.
      return output;
    };
  }
  if (typeof integration.inspect === 'function') result.inspect = (...args) => integration.inspect(...args);
  if (typeof integration.capturePreSubmit === 'function') result.capturePreSubmit = (...args) => integration.capturePreSubmit(...args);
  result.coordinationInfo = () => Object.freeze({ sessionId, methods: [...methods], optInOnly: true, mandatoryEnforcementProven: false, ...FLAGS });
  return Object.freeze(result);
}
