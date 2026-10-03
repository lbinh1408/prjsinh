/*
 * validationRunner.js
 *
 * Phase 1 — Data Validation Layer
 *
 * Version: 1.0.0
 *
 * Responsibility:
 *
 *   RECEIVE
 *      ↓
 *   RUN INDIVIDUAL VALIDATORS
 *      ↓
 *   FILTER VALID ARTIFACTS
 *      ↓
 *   RUN CROSS-CONTRACT VALIDATION
 *      ↓
 *   AGGREGATE REPORTS
 *      ↓
 *   RETURN
 *
 * IMPORTANT:
 *
 * ValidationRunner is an ORCHESTRATOR.
 *
 * It MUST NOT:
 *
 *   - implement validation rules
 *   - mutate artifacts
 *   - auto-fix data
 *   - infer missing values
 *   - calculate mastery
 *   - choose next action
 *   - diagnose remediation
 *   - rebuild Student State
 *   - perform analytics
 *
 * Cross-contract validation receives ONLY artifacts
 * that passed their corresponding individual validator.
 */


import {
    validateKnowledgeMap
} from "../../engines/knowledge/validators/knowledgeValidator.js";


import {
    validateQuestion
} from "./questionValidator.js";


import {
    validateAttempt
} from "./attemptValidator.js";


import {
    validateStudentState
} from "./studentStateValidator.js";


import {
    validateLesson
} from "./lessonValidator.js";


import {
    validateEvent
} from "./eventValidator.js";


import {
    validateCrossContract
} from "./crossContractValidator.js";


const RUNNER_NAME =
    "validation-runner";

const RUNNER_VERSION =
    "1.0.0";


/* =========================================================
 * Public API
 * ========================================================= */


/**
 * Run the complete Phase 1 validation pipeline.
 *
 * Expected input:
 *
 * {
 *   knowledgeMap,
 *   questions,
 *   attempts,
 *   studentState,
 *   lessons,
 *   events,
 *   failureRegistry
 * }
 *
 * Every artifact is optional.
 *
 *
 * options:
 *
 * {
 *   errorRegistry,
 *   environment,
 *   paths,
 *   stopCrossContractOnIndividualFailure
 * }
 *
 *
 * Default policy:
 *
 * stopCrossContractOnIndividualFailure = false
 *
 * Meaning:
 *
 *   Cross-contract validation still runs,
 *   but ONLY with individually valid artifacts.
 *
 * This avoids cascade errors while preserving
 * maximum useful validation coverage.
 */
export function runValidation(
    artifacts = {},
    options = {}
) {

    const startedAt =
        Date.now();


    const context =
        createRunnerContext(
            artifacts,
            options
        );


    /*
     * Stage 1
     *
     * Individual validation.
     */
    runIndividualValidation(
        context
    );


    /*
     * Stage 2
     *
     * Cross-contract validation.
     */
    runCrossContractValidation(
        context
    );


    /*
     * Stage 3
     *
     * Aggregate reports.
     */
    return buildRunnerReport(
        context,
        startedAt
    );
}


/* =========================================================
 * Context
 * ========================================================= */


function createRunnerContext(
    artifacts,
    options
) {

    return {

        artifacts:
            artifacts ?? {},

        options: {

            errorRegistry:
                options.errorRegistry ??
                null,

            environment:
                options.environment ??
                "test",

            paths:
                options.paths ?? {},

            stopCrossContractOnIndividualFailure:
                options.stopCrossContractOnIndividualFailure
                === true
        },

        reports: {

            knowledge:
                null,

            questions:
                [],

            attempts:
                [],

            studentState:
                null,

            lessons:
                [],

            events:
                [],

            crossContract:
                null
        },

        validArtifacts: {

            knowledgeMap:
                null,

            questions:
                [],

            attempts:
                [],

            studentState:
                null,

            lessons:
                [],

            events:
                [],

            failureRegistry:
                artifacts?.failureRegistry ??
                null
        },

        execution: {

            individualValidatorsRun:
                0,

            individualValidatorsPassed:
                0,

            individualValidatorsFailed:
                0,

            crossContractRun:
                false,

            crossContractSkipped:
                false,

            crossContractSkipReason:
                null
        }
    };
}


/* =========================================================
 * Stage 1
 *
 * Individual validation
 * ========================================================= */


function runIndividualValidation(
    context
) {

    validateKnowledgeArtifact(
        context
    );


    validateQuestionArtifacts(
        context
    );


    validateAttemptArtifacts(
        context
    );


    validateStudentStateArtifact(
        context
    );


    validateLessonArtifacts(
        context
    );


    validateEventArtifacts(
        context
    );
}


/* =========================================================
 * Knowledge
 * ========================================================= */


function validateKnowledgeArtifact(
    context
) {

    const knowledgeMap =
        context.artifacts
            .knowledgeMap;


    if (knowledgeMap == null) {
        return;
    }


    const report =
        validateKnowledgeMap(
            knowledgeMap,
            createValidatorOptions(
                context,
                "knowledge"
            )
        );


    context.reports.knowledge =
        report;


    registerIndividualResult(
        context,
        report
    );


    if (report.valid) {

        context.validArtifacts
            .knowledgeMap =
            knowledgeMap;
    }
}


/* =========================================================
 * Questions
 * ========================================================= */


function validateQuestionArtifacts(
    context
) {

    const questions =
        normalizeCollection(
            context.artifacts.questions
        );


    questions.forEach(
        (question, index) => {

            const report =
                validateQuestion(
                    question,
                    createValidatorOptions(
                        context,
                        "questions",
                        index,
                        {
                            knowledgeMap:
                                context.artifacts
                                    .knowledgeMap,

                            failureRegistry:
                                context.artifacts
                                    .failureRegistry
                        }
                    )
                );


            context.reports.questions
                .push(report);


            registerIndividualResult(
                context,
                report
            );


            if (report.valid) {

                context.validArtifacts
                    .questions
                    .push(question);
            }
        }
    );
}


/* =========================================================
 * Attempts
 * ========================================================= */


function validateAttemptArtifacts(
    context
) {

    const attempts =
        normalizeCollection(
            context.artifacts.attempts
        );


    const questionRegistry =
        normalizeCollection(
            context.artifacts.questions
        );


    attempts.forEach(
        (attempt, index) => {

            const report =
                validateAttempt(
                    attempt,
                    createValidatorOptions(
                        context,
                        "attempts",
                        index,
                        {
                            questions:
                                questionRegistry,

                            knowledgeMap:
                                context.artifacts
                                    .knowledgeMap,

                            failureRegistry:
                                context.artifacts
                                    .failureRegistry,

                            studentState:
                                context.artifacts
                                    .studentState
                        }
                    )
                );


            context.reports.attempts
                .push(report);


            registerIndividualResult(
                context,
                report
            );


            if (report.valid) {

                context.validArtifacts
                    .attempts
                    .push(attempt);
            }
        }
    );
}


/* =========================================================
 * Student State
 * ========================================================= */


function validateStudentStateArtifact(
    context
) {

    const studentState =
        context.artifacts
            .studentState;


    if (studentState == null) {
        return;
    }


    const report =
        validateStudentState(
            studentState,
            createValidatorOptions(
                context,
                "studentState",
                null,
                {
                    knowledgeMap:
                        context.artifacts
                            .knowledgeMap,

                    failureRegistry:
                        context.artifacts
                            .failureRegistry
                }
            )
        );


    context.reports.studentState =
        report;


    registerIndividualResult(
        context,
        report
    );


    if (report.valid) {

        context.validArtifacts
            .studentState =
            studentState;
    }
}


/* =========================================================
 * Lessons
 * ========================================================= */


function validateLessonArtifacts(
    context
) {

    const lessons =
        normalizeCollection(
            context.artifacts.lessons
        );


    lessons.forEach(
        (lesson, index) => {

            const report =
                validateLesson(
                    lesson,
                    createValidatorOptions(
                        context,
                        "lessons",
                        index,
                        {
                            knowledgeMap:
                                context.artifacts
                                    .knowledgeMap,

                            questions:
                                context.artifacts
                                    .questions,

                            failureRegistry:
                                context.artifacts
                                    .failureRegistry
                        }
                    )
                );


            context.reports.lessons
                .push(report);


            registerIndividualResult(
                context,
                report
            );


            if (report.valid) {

                context.validArtifacts
                    .lessons
                    .push(lesson);
            }
        }
    );
}


/* =========================================================
 * Events
 * ========================================================= */


function validateEventArtifacts(
    context
) {

    const events =
        normalizeCollection(
            context.artifacts.events
        );


    events.forEach(
        (event, index) => {

            const report =
                validateEvent(
                    event,
                    createValidatorOptions(
                        context,
                        "events",
                        index,
                        {
                            knowledgeMap:
                                context.artifacts
                                    .knowledgeMap,

                            questions:
                                context.artifacts
                                    .questions,

                            failureRegistry:
                                context.artifacts
                                    .failureRegistry
                        }
                    )
                );


            context.reports.events
                .push(report);


            registerIndividualResult(
                context,
                report
            );


            if (report.valid) {

                context.validArtifacts
                    .events
                    .push(event);
            }
        }
    );
}


/* =========================================================
 * Stage 2
 *
 * Cross-contract validation
 * ========================================================= */


function runCrossContractValidation(
    context
) {

    /*
     * Optional strict policy:
     *
     * If enabled, ANY individual validation
     * failure prevents cross-contract execution.
     *
     * Default is false.
     */
    if (
        context.options
            .stopCrossContractOnIndividualFailure &&
        context.execution
            .individualValidatorsFailed > 0
    ) {

        context.execution
            .crossContractSkipped =
            true;


        context.execution
            .crossContractSkipReason =
            "individual-validation-failed";


        return;
    }


    /*
     * IMPORTANT:
     *
     * Cross validator receives only artifacts
     * that individually passed.
     *
     * Example:
     *
     * 10 Questions:
     *
     * Q1..Q9 valid
     * Q10 invalid
     *
     * Cross validator still checks Q1..Q9.
     * Q10 is excluded.
     *
     * This prevents cascading false mismatches.
     */
    const crossArtifacts = {

        knowledgeMap:
            context.validArtifacts
                .knowledgeMap,

        questions:
            context.validArtifacts
                .questions,

        attempts:
            context.validArtifacts
                .attempts,

        studentState:
            context.validArtifacts
                .studentState,

        lessons:
            context.validArtifacts
                .lessons,

        events:
            context.validArtifacts
                .events,

        failureRegistry:
            context.validArtifacts
                .failureRegistry
    };


    const report =
        validateCrossContract(
            crossArtifacts,
            {
                errorRegistry:
                    context.options
                        .errorRegistry,

                environment:
                    context.options
                        .environment,

                path:
                    context.options
                        .paths
                        ?.crossContract ??
                    null
            }
        );


    context.reports.crossContract =
        report;


    context.execution
        .crossContractRun =
        true;
}


/* =========================================================
 * Validator option adapter
 * ========================================================= */


/**
 * Build a shared options object.
 *
 * Extra fields are intentionally passed through
 * because each validator owns which options it uses.
 *
 * Runner does not interpret validator contracts.
 */
function createValidatorOptions(
    context,
    artifactType,
    index = null,
    extra = {}
) {

    return {

        errorRegistry:
            context.options
                .errorRegistry,

        environment:
            context.options
                .environment,

        path:
            resolveArtifactPath(
                context,
                artifactType,
                index
            ),

        ...extra
    };
}


/* =========================================================
 * Execution bookkeeping
 * ========================================================= */


function registerIndividualResult(
    context,
    report
) {

    context.execution
        .individualValidatorsRun++;


    if (report?.valid === true) {

        context.execution
            .individualValidatorsPassed++;

    } else {

        context.execution
            .individualValidatorsFailed++;
    }
}


/* =========================================================
 * Stage 3
 *
 * Final aggregation
 * ========================================================= */


function buildRunnerReport(
    context,
    startedAt
) {

    const durationMs =
        Date.now() -
        startedAt;


    const allReports =
        collectExecutedReports(
            context
        );


    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;


    for (const report of allReports) {

        errorCount +=
            safeNumber(
                report?.summary
                    ?.errorCount
            );


        warningCount +=
            safeNumber(
                report?.summary
                    ?.warningCount
            );


        infoCount +=
            safeNumber(
                report?.summary
                    ?.infoCount
            );
    }


    const individualValid =
        context.execution
            .individualValidatorsFailed === 0;


    const crossContractValid =
        context.execution
            .crossContractRun
            ? context.reports
                .crossContract
                ?.valid === true
            : null;


    /*
     * Overall validity:
     *
     * 1. Every executed individual validator
     *    must pass.
     *
     * 2. If cross-contract ran, it must pass.
     *
     * 3. If cross-contract was skipped because
     *    strict policy detected individual failure,
     *    overall is already false.
     */
    const valid =
        individualValid &&
        (
            crossContractValid === null ||
            crossContractValid === true
        );


    return {

        schemaVersion:
            "1.0.0",

        validationId:
            createValidationId(),

        validator: {
            name:
                RUNNER_NAME,

            version:
                RUNNER_VERSION
        },

        target: {
            type:
                "validation-run",

            id:
                null,

            path:
                context.options
                    .paths
                    ?.root ??
                null
        },

        valid,

        summary: {

            errorCount,
            warningCount,
            infoCount,

            individual: {

                run:
                    context.execution
                        .individualValidatorsRun,

                passed:
                    context.execution
                        .individualValidatorsPassed,

                failed:
                    context.execution
                        .individualValidatorsFailed
            },

            crossContract: {

                run:
                    context.execution
                        .crossContractRun,

                skipped:
                    context.execution
                        .crossContractSkipped,

                valid:
                    crossContractValid,

                skipReason:
                    context.execution
                        .crossContractSkipReason
            },

            artifacts:
                buildArtifactSummary(
                    context
                )
        },

        /*
         * Preserve validator provenance.
         *
         * We intentionally DO NOT flatten every
         * issue into one giant issues[] array.
         */
        reports: {

            knowledge:
                context.reports
                    .knowledge,

            questions:
                context.reports
                    .questions,

            attempts:
                context.reports
                    .attempts,

            studentState:
                context.reports
                    .studentState,

            lessons:
                context.reports
                    .lessons,

            events:
                context.reports
                    .events,

            crossContract:
                context.reports
                    .crossContract
        },

        metadata: {

            validatedAt:
                new Date()
                    .toISOString(),

            durationMs,

            environment:
                context.options
                    .environment,

            policy: {

                crossContractInput:
                    "individually-valid-artifacts-only",

                stopCrossContractOnIndividualFailure:
                    context.options
                        .stopCrossContractOnIndividualFailure
            }
        }
    };
}


/* =========================================================
 * Artifact summary
 * ========================================================= */


function buildArtifactSummary(
    context
) {

    const questions =
        normalizeCollection(
            context.artifacts.questions
        );


    const attempts =
        normalizeCollection(
            context.artifacts.attempts
        );


    const lessons =
        normalizeCollection(
            context.artifacts.lessons
        );


    const events =
        normalizeCollection(
            context.artifacts.events
        );


    return {

        knowledge: {

            supplied:
                context.artifacts
                    .knowledgeMap != null,

            valid:
                context.reports
                    .knowledge?.valid ??
                null
        },

        questions: {

            supplied:
                questions.length,

            valid:
                context.validArtifacts
                    .questions.length,

            invalid:
                questions.length -
                context.validArtifacts
                    .questions.length
        },

        attempts: {

            supplied:
                attempts.length,

            valid:
                context.validArtifacts
                    .attempts.length,

            invalid:
                attempts.length -
                context.validArtifacts
                    .attempts.length
        },

        studentState: {

            supplied:
                context.artifacts
                    .studentState != null,

            valid:
                context.reports
                    .studentState?.valid ??
                null
        },

        lessons: {

            supplied:
                lessons.length,

            valid:
                context.validArtifacts
                    .lessons.length,

            invalid:
                lessons.length -
                context.validArtifacts
                    .lessons.length
        },

        events: {

            supplied:
                events.length,

            valid:
                context.validArtifacts
                    .events.length,

            invalid:
                events.length -
                context.validArtifacts
                    .events.length
        }
    };
}


/* =========================================================
 * Report collection
 * ========================================================= */


function collectExecutedReports(
    context
) {

    const reports = [];


    pushReport(
        reports,
        context.reports
            .knowledge
    );


    pushReports(
        reports,
        context.reports
            .questions
    );


    pushReports(
        reports,
        context.reports
            .attempts
    );


    pushReport(
        reports,
        context.reports
            .studentState
    );


    pushReports(
        reports,
        context.reports
            .lessons
    );


    pushReports(
        reports,
        context.reports
            .events
    );


    pushReport(
        reports,
        context.reports
            .crossContract
    );


    return reports;
}


function pushReport(
    target,
    report
) {

    if (
        report &&
        typeof report === "object"
    ) {

        target.push(report);
    }
}


function pushReports(
    target,
    reports
) {

    if (!Array.isArray(reports)) {
        return;
    }


    for (const report of reports) {

        pushReport(
            target,
            report
        );
    }
}


/* =========================================================
 * Collection normalization
 * ========================================================= */


/**
 * Normalize supported collection forms:
 *
 *   null
 *   single artifact
 *   array
 *   Map
 *   registry object
 *
 * No mutation.
 */
function normalizeCollection(
    value
) {

    if (value == null) {
        return [];
    }


    if (Array.isArray(value)) {

        return value;
    }


    if (value instanceof Map) {

        return [
            ...value.values()
        ];
    }


    if (
        typeof value === "object"
    ) {

        /*
         * Single artifact detection.
         */
        if (
            isNonEmptyString(
                value.id
            ) ||
            isNonEmptyString(
                value.attemptId
            ) ||
            isNonEmptyString(
                value.eventId
            )
        ) {

            return [value];
        }


        /*
         * Plain registry object:
         *
         * {
         *   Q001: {...},
         *   Q002: {...}
         * }
         */
        return Object.values(
            value
        );
    }


    return [];
}


/* =========================================================
 * Path helpers
 * ========================================================= */


function resolveArtifactPath(
    context,
    artifactType,
    index
) {

    const configured =
        context.options
            .paths?.[artifactType];


    /*
     * Explicit path array.
     *
     * Example:
     *
     * paths.questions = [
     *   "questions/Q001.json",
     *   "questions/Q002.json"
     * ]
     */
    if (
        Array.isArray(configured) &&
        index !== null
    ) {

        return (
            configured[index] ??
            null
        );
    }


    /*
     * Single configured path.
     */
    if (
        typeof configured ===
        "string"
    ) {

        return configured;
    }


    return null;
}


/* =========================================================
 * Utilities
 * ========================================================= */


function safeNumber(
    value
) {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    )
        ? value
        : 0;
}


function isNonEmptyString(
    value
) {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}


function createValidationId() {

    return (
        "VAL-RUN-" +
        Date.now()
            .toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()
    );
}