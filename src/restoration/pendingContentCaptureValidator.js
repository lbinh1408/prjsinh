import { isDeepStrictEqual } from 'node:util';
import { getNextLessonItem } from '../engines/lesson/lessonEngine.js';

const fail = code => {
    const error = new Error(code);
    error.code = code;
    throw error;
};

const isRecord = value =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

export function validatePendingContentCapture(checkpoint) {
    if (!isRecord(checkpoint)) {
        fail('PENDING_INVALID_CHECKPOINT');
    }

    if (
        checkpoint.currentSelection !== null ||
        checkpoint.currentQuestion !== null
    ) {
        fail('PENDING_QUESTION_STATE');
    }

    const runtime = checkpoint.lessonRuntime;
    const pending = runtime?.currentItem;
    const plan = runtime?.plan;
    const progress = runtime?.progress;

    if (!isRecord(pending) || pending.kind !== 'content') {
        fail('PENDING_UNSUPPORTED_KIND');
    }

    if (
        !isRecord(plan) ||
        plan.status !== 'READY' ||
        !Array.isArray(plan.items)
    ) {
        fail('PENDING_INVALID_PLAN');
    }

    if (
        !isRecord(progress) ||
        !Array.isArray(progress.completedSectionIds) ||
        !Array.isArray(progress.skippedSectionIds)
    ) {
        fail('PENDING_INVALID_PROGRESS');
    }

    const ids = plan.items.map(item => item?.sectionId);

    if (
        ids.some(id => typeof id !== 'string' || !id.length) ||
        new Set(ids).size !== ids.length
    ) {
        fail('PENDING_AMBIGUOUS_SECTION');
    }

    const navigation = getNextLessonItem({
        plan,
        progress
    });

    if (
        navigation.status !== 'NEXT_ITEM' ||
        !isRecord(navigation.item)
    ) {
        fail('PENDING_NO_NEXT_ITEM');
    }

    if (
        navigation.item.kind !== 'content' ||
        navigation.item.disposition !== 'include' ||
        !isDeepStrictEqual(navigation.item, pending)
    ) {
        fail('PENDING_NAVIGATION_MISMATCH');
    }

    if (
        progress.completedSectionIds.includes(pending.sectionId) ||
        progress.skippedSectionIds.includes(pending.sectionId)
    ) {
        fail('PENDING_ALREADY_RESOLVED');
    }

    return Object.freeze({
        status: 'validated-pending-content',
        sectionId: pending.sectionId,
        executable: false
    });
}