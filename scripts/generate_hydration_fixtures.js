import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStudySession, getNextStudyItem, submitAnswer } from "../src/engines/orchestration/studySession.js";
import { createAttemptStore } from "../src/persistence/attemptStore.js";
import { createCheckpointStore } from "../src/persistence/checkpointStore.js";
import { createPersistenceCoordinator } from "../src/persistence/persistenceCoordinator.js";

import lessonK283 from "../src/data/lessons/c09/lesson-k283.json" with { type: "json" };
import questionBankK283 from "../src/data/questions/c09/K283.question-bank.json" with { type: "json" };
import knowledgeMap from "../src/data/knowledge/knowledge-map-v4.json" with { type: "json" };
import evidenceModel from "../src/data/mastery/evidence.json" with { type: "json" };
import masteryRules from "../src/policies/mastery/rules.json" with { type: "json" };
import adaptiveRules from "../src/policies/adaptive/rules.json" with { type: "json" };
import adaptivePaths from "../src/policies/adaptive/paths.json" with { type: "json" };
import failureSignatures from "../src/data/remediation/failure-signatures.json" with { type: "json" };

const ATTEMPT_ID = "ATT-K283-Q010-001";
const FIXED_NOW = "2026-10-07T10:00:00.000Z";
const SUBMIT_NOW = "2026-10-07T10:05:00.000Z";
const QUESTION_STARTED_AT = "2026-10-07T10:04:00.000Z";
const TARGET_NODE = "K283";
const LESSON_ID = "lesson-k283-v1";
const TRANSFER_SECTION_ID = "S09";
const TRANSFER_QUESTION_ID = "Q-A-K283-T-010";

function deepClone(value) {
    return structuredClone(value);
}

function makeStudentState() {
    return {
        schemaVersion: "1.2.0",
        stateId: "STATE-K283-LF-001",
        stateType: "student-learning-state",
        updatedAt: FIXED_NOW,
        student: { studentId: "STUDENT-K283-LF" },
        learning: {
            currentMode: "HOC_SAU",
            session: {
                sessionId: null, startedAt: null, lastActivityAt: null, timeBudgetMinutes: 60, timeUsedMinutes: 0,
                runtimeSignals: { consecutiveWrong: 0, consecutiveSkip: 0, consecutiveRemediation: 0 },
                fatigue: { level: "normal", signals: [] }
            },
            current: { clusterId: null, lessonId: null, nodeId: null, action: null, contextId: null }
        },
        knowledge: {
            K283: {
                mastery: "M3",
                status: "developing",
                evidence: { know: 0.85, explain: 0.80, apply: 0.75, transfer: 0.45 },
                overallEvidence: 0.71,
                confidence: "high",
                evidenceSufficiency: { independentObservations: 5, distinctContexts: 2, distinctQuestionTypes: 1, observedEvidenceTypes: ["know", "explain", "apply"] },
                attemptStats: { total: 5, correct: 4, wrong: 1, partial: 0, skipped: 0 },
                weakEvidence: ["transfer"],
                signals: [], lastAttemptAt: null, lastSuccessAt: null, lastFailure: null,
                retest: { attempted: false, lastRetestAt: null, passed: false, differentQuestion: false, differentContext: false, independent: false },
                review: { lastReviewedAt: null }
            }
        },
        metaSkills: {}, failurePatterns: {}, remediation: { lastResult: null, activePlan: null },
        adaptive: { lastDecision: null, nextAction: null },
        history: { recentActions: [], recentQuestions: [] },
        progress: {}, preferences: {}
    };
}

function makeChallengeDecision() {
    return {
        decisionId: "DEC-K283-TRANSFER-D4-001", action: "CHALLENGE",
        target: { primaryNodeId: TARGET_NODE, nodeIds: [TARGET_NODE] },
        selectionCriteria: {
            questionTypes: ["numeric"], difficulty: { min: "D4", max: "D4", preferred: "D4" }, evidenceDimensions: ["transfer"],
            excludeQuestionIds: [], requireDifferentQuestion: false, requireDifferentContext: false, requireIndependentEvidence: false, metaSkills: [], secondaryNodes: [], failureSignatures: []
        },
        constraints: { requireDifferentQuestion: false, requireDifferentContext: false },
        path: { current: "CHALLENGE", next: null }, reason: { codes: ["INTEGRATION_TEST_TRANSFER"] }, priority: 1
    };
}

function makeSession() {
    return createStudySession({
        sessionId: "SESSION-K283-LF-001", studentState: makeStudentState(), initialDecision: makeChallengeDecision(),
        questionBanks: questionBankK283, knowledgeMap, masteryRules, evidenceModel, adaptiveRules, adaptivePaths,
        failureSignatures, remediationRules: {}, lesson: lessonK283, learningMode: "HOC_SAU", timeBudget: 60,
        clusterId: "C09", lessonId: LESSON_ID, contextId: "runtime-k283-learningflow", history: [], historyLimit: 50, now: FIXED_NOW
    });
}

function navigateToTransferSection(session) {
    const next = deepClone(session);
    next.lessonRuntime.progress.completedSectionIds = ["S08"];
    return next;
}

function selectTransferQuestion(session) {
    const prepared = navigateToTransferSection(session);
    const result = getNextStudyItem({ session: prepared, now: FIXED_NOW });
    return result;
}

async function main() {
    const session = makeSession();
    const selected = selectTransferQuestion(session);
    
    const submitted = submitAnswer({
        session: selected.session,
        attemptId: ATTEMPT_ID,
        response: 25,
        startedAt: QUESTION_STARTED_AT,
        submittedAt: SUBMIT_NOW,
        now: SUBMIT_NOW
    });

    const attemptStore = createAttemptStore();
    const checkpointStore = createCheckpointStore();
    const coordinator = createPersistenceCoordinator({ attemptStore, checkpointStore });
    
    const DUMMY_SHA = "0000000000000000000000000000000000000000000000000000000000000000";
    
    const contentRefs = {
        lesson: { id: lessonK283.id, version: "1.0.0", sha256: DUMMY_SHA },
        knowledgeMap: { id: "knowledgeMap", version: "1.0.0", sha256: DUMMY_SHA },
        evidenceModel: { id: "evidenceModel", version: "1.0.0", sha256: DUMMY_SHA },
        masteryRules: { id: "masteryRules", version: "1.0.0", sha256: DUMMY_SHA },
        adaptiveRules: { id: "adaptiveRules", version: "1.0.0", sha256: DUMMY_SHA },
        adaptivePaths: { id: "adaptivePaths", version: "1.0.0", sha256: DUMMY_SHA },
        failureSignatures: { id: "failureSignatures", version: "1.0.0", sha256: DUMMY_SHA },
        remediationRules: { id: "none", version: "1.0.0", sha256: DUMMY_SHA }
    };

    const persistResult = coordinator.persistSession({
        session: submitted.session,
        contentRefs,
        revision: 1,
        expectedRevision: 0,
        savedAt: SUBMIT_NOW
    });

    const sessionId = submitted.session.runtime.sessionId;
    const checkpoint = checkpointStore.getCheckpoint({ sessionId });
    const attempts = attemptStore.listAttempts({ sessionId });

    const expectedAttemptIds = attempts.map(a => a.attemptId);
    let valid = true;
    if (expectedAttemptIds.length !== checkpoint.attemptIds.length) {
        console.error("Mismatch in attempts count:", expectedAttemptIds.length, checkpoint.attemptIds.length);
        valid = false;
    }
    for(let i = 0; i < expectedAttemptIds.length; i++) {
        if (expectedAttemptIds[i] !== checkpoint.attemptIds[i]) {
            console.error("Mismatch at index", i, expectedAttemptIds[i], checkpoint.attemptIds[i]);
            valid = false;
        }
    }

    if (!valid) {
        console.error("Checkpoint attemptIds do not match Attempts array!");
        process.exit(1);
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const outDir = path.resolve(__dirname, "../tests/fixtures/hydration");
    await fs.mkdir(outDir, { recursive: true });

    const checkpointPath = path.join(outDir, "k283-checkpoint.json");
    const attemptsPath = path.join(outDir, "k283-attempts.json");

    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
    await fs.writeFile(attemptsPath, JSON.stringify(attempts, null, 2));

    console.log("Success!");
    console.log("Wrote checkpoint to:", checkpointPath);
    console.log("Wrote attempts to:", attemptsPath);
}

main().catch(console.error);
