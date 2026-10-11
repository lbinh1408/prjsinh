/** CLI-only completion policy. Does not alter LOCKED engines or authorize recovery. */
export const MASTERY_LEVELS = Object.freeze(['M0', 'M1', 'M2', 'M3', 'M4']);
export function evaluateK283Completion({ nodeState, targetMastery = 'M2', checkpointObserved = false } = {}) {
    if (!MASTERY_LEVELS.includes(targetMastery)) throw new Error('K283_INVALID_TARGET_MASTERY');
    if (!checkpointObserved) return { complete: false, reason: 'CHECKPOINT_NOT_OBSERVED' };
    const current = nodeState?.mastery;
    if (!MASTERY_LEVELS.includes(current)) return { complete: false, reason: 'MASTERY_UNAVAILABLE' };
    const complete = MASTERY_LEVELS.indexOf(current) >= MASTERY_LEVELS.indexOf(targetMastery);
    return { complete, reason: complete ? 'TARGET_MASTERY_REACHED' : 'TARGET_MASTERY_NOT_REACHED', currentMastery: current, targetMastery };
}
