import assert from 'node:assert/strict';

export function assertRealPendingItem(snapshot) {
    assert.equal(snapshot?.runtime?.status, 'active', 'session must be active');
    const item = snapshot?.lessonRuntime?.currentItem;
    assert.ok(item && typeof item === 'object', 'capture must contain an actual pending lesson item');
    assert.equal(item.kind, 'content', 'V1 supports content items only; question sets require submitAnswer');
    assert.equal(typeof item.sectionId, 'string');
    assert.ok(item.sectionId.length > 0);
    assert.ok(snapshot.lessonRuntime.plan, 'lesson plan must have been produced by StudySession');
    return item;
}

export function compareMultiStepRealContinuation({ api, original, restored, steps = 3, startTime = '2026-10-09T08:02:00.000Z' }) {
    assert.ok(Number.isSafeInteger(steps) && steps >= 2 && steps <= 20);
    assertRealPendingItem(original);
    assert.deepEqual(restored, original, 'reconstructed snapshot must match before continuation');
    let left = structuredClone(original), right = structuredClone(restored);
    const trace = [];
    for (let i = 0; i < steps; i++) {
        const now = new Date(Date.parse(startTime) + i * 60_000).toISOString();
        const pending = left.lessonRuntime.currentItem;
        let operation;
        if (pending) {
            assert.equal(pending.kind, 'content', 'unsupported pending item kind: ' + pending.kind);
            const sectionId = pending.sectionId;
            const leftResult = api.completeLessonItem({
                session: left,
                sectionId,
                now
            });

            const rightResult = api.completeLessonItem({
                session: right,
                sectionId,
                now
            });

            assert.equal(leftResult.status, 'ITEM_COMPLETED');
            assert.deepEqual(
                rightResult.status,
                leftResult.status,
                'completion status drift at step ' + i
            );

            assert.deepEqual(
                rightResult.progress,
                leftResult.progress,
                'completion progress drift at step ' + i
            );

            left = leftResult.session;
            right = rightResult.session;

            operation = 'complete:' + sectionId;
        } else {
            const l = api.getNextStudyItem({ session: left, now });
            const r = api.getNextStudyItem({ session: right, now });
            assert.deepEqual(r.status, l.status, 'navigation status drift at step ' + i);
            assert.deepEqual(r.item, l.item, 'navigation item drift at step ' + i);
            left = l.session; right = r.session; operation = 'navigate:' + l.status;
        }
        assert.deepEqual(right, left, 'behavioral drift at step ' + i + ' (' + operation + ')');
        trace.push({ step: i + 1, operation });
    }
    return { equivalent: true, stepsCompared: trace.length, trace, executable: false };
}
