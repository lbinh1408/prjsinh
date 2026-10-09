/** Phase 3.3-C: observational equivalence harness. Not an execution permit. */
export const EQUIVALENCE_CODES = Object.freeze({ INVALID: 'EQUIVALENCE_INVALID', DIVERGED: 'EQUIVALENCE_DIVERGED', EXECUTION_FAILED: 'EQUIVALENCE_EXECUTION_FAILED' });
export class EquivalenceError extends Error { constructor(code) { super(code); this.name = 'EquivalenceError'; this.code = code; } }
const fail = code => { throw new EquivalenceError(code); };
const rec = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const clone = x => structuredClone(x);
const equal = (a, b) => {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => equal(v, b[i]));
    if (!rec(a) || !rec(b)) return false;
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && equal(a[k], b[k]));
};
const FIELDS = Object.freeze(['runtime', 'config', 'state', 'currentDecision', 'currentSelection', 'currentQuestion', 'lessonRuntime', 'activeRemediationPlan', 'attempts', 'history', 'masteryRuntime', 'lastFlowResult']);
function projection(session) {
    if (!rec(session) || !rec(session.runtime) || !rec(session.state) || !rec(session.currentDecision)) fail(EQUIVALENCE_CODES.INVALID);
    for (const key of FIELDS) if (!Object.hasOwn(session, key)) fail(EQUIVALENCE_CODES.INVALID);
    return Object.fromEntries(FIELDS.map(key => [key, clone(session[key])]));
}
/**
 * run({original,restored,steps,advance,normalize})
 * advance({session,input,now,branch,stepIndex}) must be synchronous and return
 * {session}; normalize is an optional audited, caller-supplied projection
 * normalizer (default: identity). This harness NEVER grants executable=true.
 * Both branches are executed independently from detached input copies.
 */
export function compareSessionContinuations({ original, restored, steps, advance, normalize = x => x } = {}) {
    if (typeof advance !== 'function' || typeof normalize !== 'function' || !Array.isArray(steps) || steps.length === 0 || steps.length > 100 ||
        !steps.every(s => rec(s) && typeof s.now === 'string' && s.now.length > 0 && Object.hasOwn(s, 'input'))) fail(EQUIVALENCE_CODES.INVALID);
    let left = clone(original), right = clone(restored);
    const mismatches = [];
    function inspect(index) {
        const a = normalize(projection(left)), b = normalize(projection(right));
        if (!rec(a) || !rec(b)) fail(EQUIVALENCE_CODES.INVALID);
        for (const key of FIELDS) if (!equal(a[key], b[key])) mismatches.push(Object.freeze({ stepIndex: index, field: key }));
    }
    inspect(-1);
    // Fail immediately: diverging starting states cannot be repaired by later steps.
    if (mismatches.length) return Object.freeze({ equivalent: false, executable: false, stepsCompared: 0, mismatches: Object.freeze(mismatches) });
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i]; let a, b;
        try {
            a = advance({ session: clone(left), input: clone(step.input), now: step.now, branch: 'original', stepIndex: i });
            b = advance({ session: clone(right), input: clone(step.input), now: step.now, branch: 'restored', stepIndex: i });
        } catch { fail(EQUIVALENCE_CODES.EXECUTION_FAILED); }
        if (!rec(a) || !rec(b) || !rec(a.session) || !rec(b.session) || typeof a.then === 'function' || typeof b.then === 'function') fail(EQUIVALENCE_CODES.EXECUTION_FAILED);
        left = clone(a.session); right = clone(b.session);
        inspect(i);
        if (mismatches.length) return Object.freeze({ equivalent: false, executable: false, stepsCompared: i + 1, mismatches: Object.freeze(mismatches) });
    }
    return Object.freeze({ equivalent: true, executable: false, stepsCompared: steps.length, mismatches: Object.freeze([]), scope: 'observational-only-not-a-restoration-proof' });
}
