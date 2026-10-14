/**
 * Fresh-Process Remediation Provenance E2E Worker.
 *
 * Implements Process A (generation & commit) and Process B (read & bootstrap classification)
 * as genuinely separate Node.js child processes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createDurableAttemptStore } from '../../src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from '../../src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from '../../src/restoration/durableSessionCommitV1.js';
import { createAtomicCaptureCoordinationV1 } from '../../src/restoration/atomicCaptureCoordinationV1.js';
import { createLiveSessionRevisionAuthority } from '../../src/restoration/liveSessionRevisionAuthority.js';
import { createK283PersistentMultiTurnCoordinatorV1 } from '../../src/restoration/k283PersistentMultiTurnCoordinatorV1.js';
import { createStudySession, getNextQuestion, submitAnswer } from '../../src/engines/orchestration/studySession.js';
import { decideNextAction } from '../../src/engines/adaptive/adaptiveEngine.js';
import { prepareK283DiagnosticSubmission } from '../../k283A003DiagnosticConfirmationV1.js';
import { findLatestVerifiedK283Progress } from '../../k283ProgressContinuationV1.js';
import {
    bootstrapAdaptiveDecision,
    acceptBootstrapRemediationProvenance,
    classifyBootstrapRemediationStop,
    resolveBootstrapRemediationGenerationStop,
    resolveBootstrapRemediationPolicyErrorStop
} from '../../k283AdaptiveBootstrapV1.js';
import { createRuntimeSession } from '../../liveStudyK283PersistentMultiTurnV1.js';

import questionBank from '../../src/data/questions/c09/K283.question-bank.json' with { type: 'json' };
import knowledgeMap from '../../src/data/knowledge/knowledge-map-v4.json' with { type: 'json' };
import evidenceModel from '../../src/data/mastery/evidence.json' with { type: 'json' };
import masteryRules from '../../src/policies/mastery/rules.json' with { type: 'json' };
import adaptiveRules from '../../src/policies/adaptive/rules.json' with { type: 'json' };
import adaptivePaths from '../../src/policies/adaptive/paths.json' with { type: 'json' };
import failureSignatures from '../../src/data/remediation/failure-signatures.json' with { type: 'json' };
import studentStateBase from '../../src/data/student/student-state.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

export const STOP_CONFIG = Object.freeze({
    learningMode: 'HOC_SAU',
    timeBudget: 60,
    clusterId: 'C09',
    lessonId: null,
    contextId: 'live-study-k283',
    historyLimit: 50
});

export const CONFLICTING_PROBE_AUTHORING_POLICY = Object.freeze({
    schemaVersion: '1.0.0',
    policyId: 'conflicting-types',
    policyVersion: '1.0.0',
    failureSignatureDefaults: {
        calculation_error: {
            difficulty: 'D3',
            evidenceDimension: 'apply',
            questionTypes: ['experiment']
        }
    }
});

export const DRIFTED_CANONICAL_PROBE_POLICY = Object.freeze({
    schemaVersion: '1.0.0',
    policyId: 'conflicting-types',
    policyVersion: '1.0.0',
    failureSignatureDefaults: {
        calculation_error: {
            difficulty: 'D2', // changed difficulty -> V1 fingerprint change
            evidenceDimension: 'apply',
            questionTypes: ['experiment']
        }
    }
});

const PATHS = Object.freeze({
    questionBank: './src/data/questions/c09/K283.question-bank.json',
    knowledgeMap: './src/data/knowledge/knowledge-map-v4.json',
    masteryRules: './src/policies/mastery/rules.json',
    evidenceModel: './src/data/mastery/evidence.json',
    adaptiveRules: './src/policies/adaptive/rules.json',
    adaptivePaths: './src/policies/adaptive/paths.json',
    failureSignatures: './src/data/remediation/failure-signatures.json'
});

export function buildRealContentRefs() {
    const refs = {};
    for (const [name, relative] of Object.entries(PATHS)) {
        const full = path.resolve(projectRoot, relative);
        const bytes = fs.readFileSync(full);
        refs[name] = {
            id: relative,
            version: 'cli-k283-v1',
            sha256: createHash('sha256').update(bytes).digest('hex')
        };
    }
    return refs;
}

export function loadBaseDependencies() {
    return {
        questionBank: structuredClone(questionBank),
        knowledgeMap: structuredClone(knowledgeMap),
        masteryRules: structuredClone(masteryRules),
        evidenceModel: structuredClone(evidenceModel),
        adaptiveRules: structuredClone(adaptiveRules),
        adaptivePaths: structuredClone(adaptivePaths),
        failureSignatures: structuredClone(failureSignatures),
        remediationRules: null
    };
}

async function runProcessA(config) {
    const {
        rootDir,
        sessionId,
        stopKind = 'INFEASIBLE',
        failpoint = null,
        remediationRules = null
    } = config;

    const studentState = structuredClone(studentStateBase);
    delete studentState.knowledge.K283;
    studentState.learning.session.sessionId = sessionId;
    studentState.learning.session.runtimeSignals = {
        consecutiveWrong: 0,
        consecutiveSkip: 0,
        consecutiveRemediation: 0
    };

    const initialDecision = decideNextAction({
        studentId: studentState.student.studentId,
        targetNodeId: 'K283',
        masteryState: studentState,
        knowledgeMap,
        adaptiveRules,
        adaptivePaths,
        recentResults: [],
        sessionContext: { sessionId, clusterId: 'C09', targetNodeId: 'K283' },
        learningMode: STOP_CONFIG.learningMode,
        timeBudget: STOP_CONFIG.timeBudget,
        now: '2026-10-01T08:00:00.000Z'
    });

    const effectiveRules = stopKind === 'POLICY_ERROR'
        ? { maximumDepth: 3, maxMinutes: 30, maxQuestions: 7 }
        : remediationRules;

    const sessionArgs = {
        sessionId,
        studentState,
        initialDecision,
        questionBanks: { K283: questionBank },
        knowledgeMap,
        masteryRules,
        evidenceModel,
        adaptiveRules,
        adaptivePaths,
        failureSignatures,
        remediationRules: effectiveRules,
        ...STOP_CONFIG,
        now: '2026-10-01T08:00:00.000Z'
    };

    if (stopKind === 'POLICY_ERROR') {
        sessionArgs.probeAuthoringPolicy = structuredClone(CONFLICTING_PROBE_AUTHORING_POLICY);
    }

    const session = createStudySession(sessionArgs);

    const attemptStore = createDurableAttemptStore({ rootDir: path.join(rootDir, 'attempts') });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(rootDir, 'journal'), attemptStore });

    const durableCommitClean = createDurableSessionCommitV1({
        rootDir: path.join(rootDir, 'checkpoints'),
        attemptStore,
        journal
    });
    const durableCommitFailing = failpoint ? createDurableSessionCommitV1({
        rootDir: path.join(rootDir, 'checkpoints'),
        attemptStore,
        journal,
        failpoint
    }) : durableCommitClean;

    const durableCommit = {
        commit(request) {
            // Apply failpoint only on the stop turn when remediationStopCapture is present
            if (failpoint && Object.hasOwn(request, 'remediationStopCapture')) {
                return durableCommitFailing.commit(request);
            }
            return durableCommitClean.commit(request);
        },
        read(request) {
            return durableCommitClean.read(request);
        },
        audit(request) {
            return durableCommitClean.audit(request);
        }
    };

    const coordination = createAtomicCaptureCoordinationV1({
        rootDir,
        publisher: { publish: () => ({ status: 'PUBLISHED' }) },
        capture: () => ({ status: 'INCOMPLETE' })
    });
    const authority = createLiveSessionRevisionAuthority({ initialSession: session, sessionId });
    const contentRefs = buildRealContentRefs();

    const targetQuestions = ['Q-A-K283-A-003', 'Q-A-K283-A-004'];

    const coordinator = createK283PersistentMultiTurnCoordinatorV1({
        sessionId,
        authority,
        coordination,
        attemptStore,
        journal,
        durableCommit,
        contentRefs,
        now: () => '2026-10-01T08:01:00.000Z',
        select: ({ session: current }) => {
            const index = Math.min(current.attempts.length, targetQuestions.length - 1);
            const question = questionBank.questions.find(q => q.id === targetQuestions[index]);
            const selection = {
                selectionId: `${sessionId}-selection-${current.attempts.length + 1}`,
                decisionId: current.currentDecision.decisionId,
                action: current.currentDecision.action,
                targetNodeId: 'K283',
                status: 'SELECTED',
                selected: { questionId: question.id, question }
            };
            return {
                session: { ...current, currentSelection: selection, currentQuestion: question },
                selection,
                question
            };
        },
        submit: submitAnswer
    });

    try {
        // Turn 1 wrong -> commits revision 1 cleanly
        const s1 = coordinator.selectNext();
        const p1 = prepareK283DiagnosticSubmission({ question: s1.question, response: 'A', confirmation: '1' });
        coordinator.submitSelected({
            attemptId: `${sessionId}-attempt-1`,
            args: {
                response: p1.response,
                diagnostic: p1.diagnostic,
                startedAt: '2026-10-01T08:00:00.000Z',
                submittedAt: '2026-10-01T08:01:00.000Z'
            }
        });

        // Turn 2 wrong -> Triggers REMEDIATE and generates genuine stop
        const s2 = coordinator.selectNext();
        const p2 = prepareK283DiagnosticSubmission({ question: s2.question, response: 'A', confirmation: 'yes' });
        coordinator.submitSelected({
            attemptId: `${sessionId}-attempt-2`,
            args: {
                response: p2.response,
                diagnostic: p2.diagnostic,
                startedAt: '2026-10-01T08:01:00.000Z',
                submittedAt: '2026-10-01T08:02:00.000Z'
            }
        });

        const committed = durableCommit.read({ sessionId });
        const stopExtension = committed.checkpoint.extensions?.[
            stopKind === 'INFEASIBLE' ? 'remediationGenerationStop' : 'remediationPolicyErrorStop'
        ];

        console.log(JSON.stringify({
            status: 'COMMITTED',
            pid: process.pid,
            sessionId,
            stopKind,
            checkpointRevision: committed.checkpointRevision,
            sha256: committed.sha256,
            stopExtension,
            hasProvenance: Boolean(committed.remediationStopProvenance),
            provenance: committed.remediationStopProvenance,
            attemptIds: committed.checkpoint.attemptIds
        }));
    } catch (error) {
        console.log(JSON.stringify({
            status: 'INJECTED_FAILURE_THROWN',
            pid: process.pid,
            sessionId,
            errorCode: error.code || error.message,
            errorMessage: error.message
        }));
    }
}

async function runProcessB(config) {
    const {
        rootDir,
        sessionId,
        contentRefsDrift = false,
        probeAuthoringPolicy = null,
        overrideRules = undefined,
        configDrift = null,
        checkM4Stable = false,
        checkSelection = false,
        rawDurableRead = false
    } = config;

    if (rawDurableRead) {
        const attemptStore = createDurableAttemptStore({ rootDir: path.join(rootDir, 'attempts') });
        const journal = createDurableSubmitJournalV3({ rootDir: path.join(rootDir, 'journal'), attemptStore });
        const durableCommit = createDurableSessionCommitV1({
            rootDir: path.join(rootDir, 'checkpoints'),
            attemptStore,
            journal
        });
        const readRecord = durableCommit.read({ sessionId });
        let auditRecord = null;
        try {
            auditRecord = durableCommit.audit({ sessionId });
        } catch (e) {
            auditRecord = { error: e.code || e.message };
        }
        console.log(JSON.stringify({
            status: 'SUCCESS',
            pid: process.pid,
            rawRead: readRecord ? {
                checkpointRevision: readRecord.checkpointRevision,
                hasProvenance: Object.hasOwn(readRecord, 'remediationStopProvenance'),
                provenance: readRecord.remediationStopProvenance ?? null,
                attemptIds: readRecord.checkpoint.attemptIds
            } : null,
            audit: auditRecord
        }));
        return;
    }

    const contentRefs = buildRealContentRefs();
    if (contentRefsDrift) {
        contentRefs.questionBank = { ...contentRefs.questionBank, version: 'drifted-v9.9.9' };
    }

    let progress;
    try {
        progress = findLatestVerifiedK283Progress({ rootDir, contentRefs });
    } catch (error) {
        console.log(JSON.stringify({
            status: 'FATAL_READ_FAILURE',
            pid: process.pid,
            errorName: error.name,
            errorCode: error.code || error.message,
            errorMessage: error.message
        }));
        return;
    }

    if (!progress) {
        console.log(JSON.stringify({
            status: 'NO_PROGRESS',
            pid: process.pid
        }));
        return;
    }

    const dependencies = loadBaseDependencies();
    if (overrideRules !== undefined) {
        dependencies.remediationRules = overrideRules;
    }
    if (probeAuthoringPolicy !== null) {
        dependencies.probeAuthoringPolicy = probeAuthoringPolicy;
    }

    const effectiveConfig = {
        ...STOP_CONFIG,
        ...(configDrift ?? {})
    };

    const classification = classifyBootstrapRemediationStop({
        checkpoint: progress.checkpoint,
        remediationProvenance: progress.remediationProvenance,
        dependencies,
        config: effectiveConfig,
        targetNodeId: 'K283',
        selectorConstraints: {}
    });

    let runtime = null;
    let runtimeError = null;
    try {
        runtime = createRuntimeSession(progress, probeAuthoringPolicy);
    } catch (e) {
        runtimeError = { code: e.code || e.message, message: e.message };
    }

    let resolverStatus = null;
    try {
        const resolver = progress.remediationGenerationStop
            ? resolveBootstrapRemediationGenerationStop
            : progress.remediationPolicyErrorStop
                ? resolveBootstrapRemediationPolicyErrorStop
                : null;
        if (resolver) {
            const res = resolver({
                checkpoint: progress.checkpoint,
                dependencies,
                questionBank: dependencies.questionBank,
                policy: dependencies.probeAuthoringPolicy,
                targetNodeId: 'K283',
                selectorConstraints: {},
                config: effectiveConfig
            });
            resolverStatus = res.status;
        }
    } catch (e) {
        resolverStatus = 'THREW_' + (e.code || e.message);
    }

    let m4Decision = null;
    if (checkM4Stable) {
        const studentStateM4 = {
            student: { id: 'STUDENT-M4' },
            knowledge: {
                K283: {
                    mastery: 'M4',
                    status: 'stable',
                    overallEvidence: 0.94,
                    confidence: 'very_high',
                    independentObservations: 11
                }
            }
        };
        m4Decision = bootstrapAdaptiveDecision({
            studentState: studentStateM4,
            dependencies,
            targetNodeId: 'K283',
            clusterId: STOP_CONFIG.clusterId,
            learningMode: STOP_CONFIG.learningMode
        });
    }

    let selectionResult = null;
    if (checkSelection && runtime?.session) {
        try {
            const next = getNextQuestion({ session: runtime.session });
            selectionResult = {
                status: next.selection?.status,
                hasQuestion: Boolean(next.question),
                suppressed: next.selection?.status === 'NO_MATCH' || !next.question
            };
        } catch (e) {
            selectionResult = { error: e.message, suppressed: true };
        }
    }

    console.log(JSON.stringify({
        status: 'SUCCESS',
        pid: process.pid,
        progress: {
            fromSessionId: progress.fromSessionId,
            remediationProvenanceStatus: progress.remediationProvenance?.status,
            remediationProvenance: progress.remediationProvenance?.provenance,
            hasGenerationStop: Boolean(progress.remediationGenerationStop),
            hasPolicyErrorStop: Boolean(progress.remediationPolicyErrorStop),
            attemptCountInCheckpoint: progress.checkpoint.attemptIds.length,
            knowledgeAttemptStatsTotal: progress.checkpoint.state.knowledge?.K283?.attemptStats?.total
        },
        classification,
        runtime: runtime ? {
            sessionAttemptsLength: runtime.session.attempts.length,
            remediationStopClassification: runtime.remediationStopClassification
        } : null,
        runtimeError,
        resolverStatus,
        selectionResult,
        m4Decision
    }));
}

async function main() {
    const [command, payloadString] = process.argv.slice(2);
    if (!command || !payloadString) {
        console.error('Usage: worker.mjs <process-a|process-b> <jsonPayload>');
        process.exit(1);
    }
    const payload = JSON.parse(payloadString);
    if (command === 'process-a') {
        await runProcessA(payload);
    } else if (command === 'process-b') {
        await runProcessB(payload);
    } else {
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main().catch(err => {
        console.error('Worker uncaught error:', err);
        process.exit(1);
    });
}
