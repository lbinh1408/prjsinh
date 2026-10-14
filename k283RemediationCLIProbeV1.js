import { getNextQuestion } from "./src/engines/orchestration/studySession.js";

const DIFFICULTIES = new Set(["D1", "D2", "D3", "D4", "D5"]);
const EVIDENCE_DIMENSIONS = new Set(["know", "explain", "apply", "transfer"]);

function noMatch(session, code, message, now = null) {
    const decision = session?.currentDecision ?? {};
    const selection = {
        version: "1.0.0",
        selectionId: `${decision.decisionId ?? "unknown-decision"}-probe-no-match`,
        decisionId: decision.decisionId ?? "unknown-decision",
        timestamp: now,
        action: decision.action ?? "REMEDIATE",
        targetNodeId: session?.activeRemediationPlan?.probe?.targetNodeId ?? null,
        status: "NO_MATCH",
        selected: null,
        candidates: { total: 0, targetMatched: 0, eligible: 0 },
        reason: { code, message },
        source: { selector: "K283RemediationCLIProbeAdapter", version: "1.0.0" }
    };
    const nextSession = structuredClone(session);
    nextSession.currentSelection = selection;
    nextSession.currentQuestion = null;
    return { session: nextSession, selection, question: null };
}

function resolveProbeConstraints(session) {
    const decision = session?.currentDecision;
    const expectedStages = new Set(["MINI_PRACTICE", "MINI_PROBE"]);
    const stage = expectedStages.has(decision?.path?.next)
        ? decision.path.next
        : decision?.path?.stage ?? decision?.pathStage;
    if (decision?.action !== "REMEDIATE" || !expectedStages.has(stage)) {
        return { applicable: false, session };
    }

    const plan = session?.activeRemediationPlan;
    const probe = plan?.probe;
    if (
        !probe ||
        probe.required !== true ||
        probe.type !== "MINI_PROBE" ||
        typeof plan.remediationId !== "string" ||
        !plan.remediationId.trim() ||
        typeof probe.targetNodeId !== "string" ||
        !probe.targetNodeId.trim() ||
        !Array.isArray(probe.questionTypes) ||
        probe.questionTypes.length === 0 ||
        probe.questionTypes.some(type => typeof type !== "string" || !type.trim()) ||
        !DIFFICULTIES.has(probe.difficulty)
    ) {
        throw new Error("K283_ACTIVE_PROBE_CONSTRAINTS_INVALID");
    }

    const criteria = decision.selectionCriteria ?? {};
    const existingTypes = criteria.questionTypes;
    const existingTypesValid = existingTypes === undefined ||
        (Array.isArray(existingTypes) && existingTypes.every(type => typeof type === "string"));
    const questionTypes = Array.isArray(existingTypes) && existingTypes.length > 0
        ? probe.questionTypes.filter(type => existingTypes.includes(type))
        : [...probe.questionTypes];
    const existingDimensions = criteria.evidenceDimensions ?? [];
    const requiredDimension = stage === "MINI_PROBE"
        ? probe.successCriteria?.requiredEvidenceDimension
        : undefined;
    const existingDifficulty = criteria.difficulty ?? {};
    const difficultyRank = value => DIFFICULTIES.has(value)
        ? Number(value.slice(1))
        : null;
    const probeRank = difficultyRank(probe.difficulty);
    const minRank = difficultyRank(existingDifficulty.min);
    const maxRank = difficultyRank(existingDifficulty.max);
    const existingDifficultyValid =
        (existingDifficulty.min === undefined || minRank !== null) &&
        (existingDifficulty.max === undefined || maxRank !== null) &&
        (minRank === null || maxRank === null || minRank <= maxRank);
    const existingTargets = Array.isArray(decision.target?.nodeIds) && decision.target.nodeIds.length
        ? decision.target.nodeIds
        : (decision.target?.primaryNodeId ? [decision.target.primaryNodeId] : []);

    if (
        !Array.isArray(existingDimensions) ||
        existingDimensions.some(dimension => !EVIDENCE_DIMENSIONS.has(dimension)) ||
        (requiredDimension !== undefined && !EVIDENCE_DIMENSIONS.has(requiredDimension))
    ) {
        return { applicable: true, conflict: ["K283_PROBE_EVIDENCE_CONSTRAINT_INVALID"] };
    }

    const evidenceDimensions = requiredDimension === undefined
        ? [...existingDimensions]
        : existingDimensions.length
            ? existingDimensions.filter(dimension => dimension === requiredDimension)
            : [requiredDimension];

    const conflicts = [];
    if (!existingTypesValid) conflicts.push("K283_PROBE_QUESTION_TYPE_CONSTRAINT_INVALID");
    if (!existingDifficultyValid) conflicts.push("K283_PROBE_DIFFICULTY_CONSTRAINT_INVALID");
    if (questionTypes.length === 0) conflicts.push("K283_PROBE_QUESTION_TYPE_CONFLICT");
    if (
        (minRank !== null && probeRank < minRank) ||
        (maxRank !== null && probeRank > maxRank)
    ) conflicts.push("K283_PROBE_DIFFICULTY_CONFLICT");
    if (requiredDimension !== undefined && evidenceDimensions.length === 0) {
        conflicts.push("K283_PROBE_EVIDENCE_DIMENSION_CONFLICT");
    }
    if (existingTargets.length && !existingTargets.includes(probe.targetNodeId)) {
        conflicts.push("K283_PROBE_TARGET_CONFLICT");
    }
    if (conflicts.length) return { applicable: true, conflict: conflicts };

    const next = structuredClone(session);
    next.currentDecision.target = {
        ...(next.currentDecision.target ?? {}),
        primaryNodeId: probe.targetNodeId,
        nodeIds: [probe.targetNodeId]
    };
    next.currentDecision.selectionCriteria = {
        ...criteria,
        questionTypes,
        evidenceDimensions,
        difficulty: {
            min: probe.difficulty,
            max: probe.difficulty,
            preferred: probe.difficulty
        }
    };
    return { applicable: true, session: next };
}

export function applyK283RemediationProbeConstraints(session) {
    const resolved = resolveProbeConstraints(session);
    if (!resolved.applicable) return session;
    if (resolved.conflict) {
        throw new Error(resolved.conflict.join(","));
    }
    return resolved.session;
}

export function selectK283NextQuestion({ session, now = null } = {}) {
    const resolved = resolveProbeConstraints(session);
    if (resolved.conflict) {
        return noMatch(
            session,
            "K283_PROBE_CONSTRAINT_CONFLICT",
            `Probe constraints conflict: ${resolved.conflict.join(", ")}.`,
            now
        );
    }

    const result = getNextQuestion({
        session: resolved.applicable ? resolved.session : session,
        now
    });
    if (
        resolved.applicable &&
        (session.currentDecision?.path?.next === "MINI_PROBE" ||
            session.currentDecision?.path?.stage === "MINI_PROBE" ||
            session.currentDecision?.pathStage === "MINI_PROBE") &&
        result.selection?.status === "NO_MATCH"
    ) {
        result.selection.reason = {
            code: "K283_PROBE_NO_ELIGIBLE_QUESTION",
            message: `No question satisfies the active probe constraints. ${result.selection.reason?.message ?? ""}`.trim()
        };
        result.session.currentSelection = structuredClone(result.selection);
    }
    return result;
}

export function formatK283ProbeOutcome(probeOutcome) {
    if (probeOutcome?.isProbe !== true) return null;
    const status = probeOutcome.passed === true ? "PASS" : "FAIL";
    return `Probe ${status}${probeOutcome.reason ? ` (${probeOutcome.reason})` : ""}`;
}
