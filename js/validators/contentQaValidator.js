/**
 * contentQaValidator.js
 *
 * Phase: Study MVP - Content QA
 * Version: 1.0.0
 *
 * Responsibility:
 *   READ -> CHECK -> REPORT
 *
 * Purpose:
 *   Perform deterministic / heuristic QA checks on question content
 *   AFTER structural QuestionValidator validation.
 *
 * This validator DOES NOT:
 *   - replace questionValidator.js
 *   - prove scientific correctness
 *   - modify question content
 *   - score student attempts
 *   - update mastery
 *   - diagnose actual student failures
 *   - choose remediation
 *   - choose next action
 *
 * Scientific correctness remains a separate Biology Review gate.
 */

const VALIDATOR_NAME = "content-qa-validator";
const VALIDATOR_VERSION = "1.0.0";

const VALID_EVIDENCE = new Set([
    "know",
    "explain",
    "apply",
    "transfer"
]);

const VALID_MODES = new Set([
    "diagnostic",
    "learning",
    "practice",
    "challenge",
    "retest",
    "review",
    "remediation"
]);

const HIGHER_ORDER_EVIDENCE = new Set([
    "apply",
    "transfer"
]);

const HIGH_DIFFICULTIES = new Set([
    "D4",
    "D5"
]);

const TRANSFER_CONTEXT_TYPES = new Set([
    "biological_scenario",
    "experiment",
    "data_table",
    "graph",
    "clinical_context",
    "ecological_context",
    "genetic_cross",
    "integrated_problem"
]);

const GENERIC_CONTEXT_TYPES = new Set([
    "direct"
]);

/**
 * Public API
 */
export function validateQuestionContent(question, options = {}) {
    const {
        path = "",
        knowledgeMap = null
    } = options;

    const report = createReport(question, path);

    if (!isPlainObject(question)) {
        addIssue(report, {
            code: "CONTENT_QA_INVALID_QUESTION",
            severity: "error",
            category: "content",
            path: path || "/",
            message: "Question must be an object."
        });

        return finalizeReport(report);
    }

    runStemChecks(question, report, path);
    runOptionChecks(question, report, path);
    runAnswerConsistencyChecks(question, report, path);
    runExplanationChecks(question, report, path);
    runHintChecks(question, report, path);
    runEvidenceChecks(question, report, path);
    runModeChecks(question, report, path);
    runDifficultyChecks(question, report, path);
    runTransferChecks(question, report, path);
    runRetestChecks(question, report, path);
    runFailureSignatureChecks(question, report, path);
    runRemediationChecks(question, report, path);
    runMetadataChecks(question, report, path);
    runNodeHeuristics(question, knowledgeMap, report, path);
    runScientificReviewGate(question, report, path);

    return finalizeReport(report);
}

/**
 * Optional bank-level API.
 *
 * This does NOT replace the external runner.
 * It is useful when another module wants to QA an entire bank.
 */
export function validateQuestionBankContent(bank, options = {}) {
    const questions = Array.isArray(bank)
        ? bank
        : Array.isArray(bank?.questions)
            ? bank.questions
            : [];

    const reports = questions.map((question, index) =>
        validateQuestionContent(question, {
            ...options,
            path: `/questions/${index}`
        })
    );

    const errorCount = reports.reduce(
        (sum, report) => sum + report.summary.errorCount,
        0
    );

    const warningCount = reports.reduce(
        (sum, report) => sum + report.summary.warningCount,
        0
    );

    const infoCount = reports.reduce(
        (sum, report) => sum + report.summary.infoCount,
        0
    );

    const reviewRequiredCount = reports.filter(
        report => report.review.required
    ).length;

    return {
        validator: {
            name: VALIDATOR_NAME,
            version: VALIDATOR_VERSION
        },

        bankId: bank?.bankId ?? null,

        valid: errorCount === 0,

        summary: {
            questionCount: questions.length,
            passedCount: reports.filter(r => r.valid).length,
            errorCount,
            warningCount,
            infoCount,
            reviewRequiredCount
        },

        reports
    };
}

/* =========================================================
 * STEM
 * ========================================================= */

function runStemChecks(question, report, basePath) {
    const stem = question?.content?.stem;

    if (!isNonEmptyString(stem)) {
        addIssue(report, {
            code: "CONTENT_QA_STEM_MISSING",
            severity: "error",
            category: "content",
            path: joinPath(basePath, "/content/stem"),
            message: "Question stem is missing or empty."
        });

        return;
    }

    const normalized = normalizeText(stem);

    if (normalized.length < 12) {
        addIssue(report, {
            code: "CONTENT_QA_STEM_TOO_SHORT",
            severity: "warning",
            category: "content",
            path: joinPath(basePath, "/content/stem"),
            message:
                "Question stem is unusually short and should be reviewed for clarity."
        });
    }

    if (hasSuspiciousPlaceholder(stem)) {
        addIssue(report, {
            code: "CONTENT_QA_PLACEHOLDER_TEXT",
            severity: "error",
            category: "content",
            path: joinPath(basePath, "/content/stem"),
            message:
                "Question stem appears to contain placeholder or unfinished text."
        });
    }
}

/* =========================================================
 * OPTIONS
 * ========================================================= */

function runOptionChecks(question, report, basePath) {
    if (question.questionType !== "mcq") {
        return;
    }

    const options = question?.content?.options;

    if (!Array.isArray(options) || options.length < 2) {
        return;
    }

    const normalizedTexts = options.map(option =>
        normalizeComparable(option?.text)
    );

    const seen = new Map();

    normalizedTexts.forEach((text, index) => {
        if (!text) return;

        if (seen.has(text)) {
            addIssue(report, {
                code: "CONTENT_QA_DUPLICATE_OPTION",
                severity: "error",
                category: "answer-quality",
                path: joinPath(
                    basePath,
                    `/content/options/${index}/text`
                ),
                message:
                    `Option duplicates option at index ${seen.get(text)}.`
            });
        } else {
            seen.set(text, index);
        }
    });

    const correctOptions = options.filter(
        option => option?.isCorrect === true
    );

    if (correctOptions.length !== 1) {
        addIssue(report, {
            code: "CONTENT_QA_MCQ_CORRECT_COUNT",
            severity: "error",
            category: "answer-quality",
            path: joinPath(basePath, "/content/options"),
            message:
                `MCQ should have exactly one option marked correct; found ${correctOptions.length}.`
        });
    }

    const optionLengths = options
        .map(option => normalizeText(option?.text ?? "").length)
        .filter(length => length > 0);

    if (optionLengths.length >= 3) {
        const maxLength = Math.max(...optionLengths);
        const minLength = Math.min(...optionLengths);

        if (
            minLength > 0 &&
            maxLength >= 80 &&
            maxLength / minLength >= 4
        ) {
            addIssue(report, {
                code: "CONTENT_QA_OPTION_LENGTH_BIAS",
                severity: "warning",
                category: "distractor-quality",
                path: joinPath(basePath, "/content/options"),
                message:
                    "One option is substantially longer than another. Review for answer-length cueing."
            });
        }
    }

    for (let i = 0; i < options.length; i++) {
        const text = options[i]?.text;

        if (hasSuspiciousPlaceholder(text)) {
            addIssue(report, {
                code: "CONTENT_QA_PLACEHOLDER_TEXT",
                severity: "error",
                category: "content",
                path: joinPath(
                    basePath,
                    `/content/options/${i}/text`
                ),
                message:
                    "Option appears to contain placeholder or unfinished text."
            });
        }
    }
}

/* =========================================================
 * ANSWER CONSISTENCY
 * ========================================================= */

function runAnswerConsistencyChecks(question, report, basePath) {
    if (question.questionType !== "mcq") {
        return;
    }

    const options = question?.content?.options;

    if (!Array.isArray(options)) {
        return;
    }

    const answer = question?.answer;

    if (answer?.type !== "single") {
        return;
    }

    const canonicalAnswer = answer.value;

    const matchingOption = options.find(
        option => option?.id === canonicalAnswer
    );

    if (!matchingOption) {
        addIssue(report, {
            code: "CONTENT_QA_ANSWER_OPTION_NOT_FOUND",
            severity: "error",
            category: "answer-quality",
            path: joinPath(basePath, "/answer/value"),
            message:
                `Canonical answer '${canonicalAnswer}' does not match any option id.`
        });

        return;
    }

    if (matchingOption.isCorrect !== true) {
        addIssue(report, {
            code: "CONTENT_QA_ANSWER_FLAG_MISMATCH",
            severity: "error",
            category: "answer-quality",
            path: joinPath(basePath, "/answer/value"),
            message:
                "Canonical answer does not point to the option marked isCorrect=true."
        });
    }
}

/* =========================================================
 * EXPLANATION
 * ========================================================= */

function runExplanationChecks(question, report, basePath) {
    const explanation = question?.explanation;

    if (!isPlainObject(explanation)) {
        return;
    }

    if (!isNonEmptyString(explanation.correct)) {
        addIssue(report, {
            code: "CONTENT_QA_CORRECT_EXPLANATION_MISSING",
            severity: "error",
            category: "explanation",
            path: joinPath(basePath, "/explanation/correct"),
            message:
                "Correct-answer explanation is missing."
        });
    }

    if (hasSuspiciousPlaceholder(explanation.correct)) {
        addIssue(report, {
            code: "CONTENT_QA_PLACEHOLDER_TEXT",
            severity: "error",
            category: "explanation",
            path: joinPath(basePath, "/explanation/correct"),
            message:
                "Correct-answer explanation appears unfinished."
        });
    }

    if (question.questionType !== "mcq") {
        return;
    }

    const options = question?.content?.options ?? [];
    const incorrect = explanation?.incorrect;

    if (!isPlainObject(incorrect)) {
        addIssue(report, {
            code: "CONTENT_QA_DISTRACTOR_EXPLANATION_MISSING",
            severity: "warning",
            category: "explanation",
            path: joinPath(basePath, "/explanation/incorrect"),
            message:
                "MCQ has no distractor-specific explanations."
        });

        return;
    }

    for (const option of options) {
        if (option?.isCorrect === true) continue;

        if (!isNonEmptyString(incorrect[option.id])) {
            addIssue(report, {
                code: "CONTENT_QA_DISTRACTOR_EXPLANATION_MISSING",
                severity: "warning",
                category: "explanation",
                path: joinPath(
                    basePath,
                    `/explanation/incorrect/${escapeJsonPointer(
                        option?.id ?? ""
                    )}`
                ),
                message:
                    `No explanation is provided for distractor '${option?.id}'.`
            });
        }
    }
}

/* =========================================================
 * HINTS
 * ========================================================= */

function runHintChecks(question, report, basePath) {
    const hint = question?.hint;

    if (!hint?.enabled) {
        return;
    }

    const levels = hint.levels;

    if (!Array.isArray(levels) || levels.length === 0) {
        addIssue(report, {
            code: "CONTENT_QA_HINT_EMPTY",
            severity: "warning",
            category: "hint",
            path: joinPath(basePath, "/hint/levels"),
            message:
                "Hints are enabled but no hint levels are provided."
        });

        return;
    }

    const answerText = getCorrectAnswerText(question);

    levels.forEach((item, index) => {
        const text = item?.text;

        if (!isNonEmptyString(text)) {
            return;
        }

        if (
            answerText &&
            normalizeComparable(text) ===
            normalizeComparable(answerText)
        ) {
            addIssue(report, {
                code: "CONTENT_QA_HINT_REVEALS_ANSWER",
                severity: "warning",
                category: "hint",
                path: joinPath(
                    basePath,
                    `/hint/levels/${index}/text`
                ),
                message:
                    "Hint appears to directly reveal the correct answer."
            });
        }
    });
}

/* =========================================================
 * EVIDENCE
 * ========================================================= */

function runEvidenceChecks(question, report, basePath) {
    const evidence = question.evidence;

    if (!VALID_EVIDENCE.has(evidence)) {
        return;
    }

    const stem = normalizeComparable(question?.content?.stem ?? "");

    if (
        evidence === "know" &&
        HIGH_DIFFICULTIES.has(question.difficulty)
    ) {
        addIssue(report, {
            code: "CONTENT_QA_EVIDENCE_DIFFICULTY_REVIEW",
            severity: "warning",
            category: "evidence",
            path: joinPath(basePath, "/evidence"),
            message:
                "Question is marked as know evidence but uses D4/D5 difficulty. Review whether the evidence dimension is appropriate."
        });
    }

    if (
        evidence === "explain" &&
        question.questionType === "mcq" &&
        stem.length < 40
    ) {
        addIssue(report, {
            code: "CONTENT_QA_EXPLAIN_EVIDENCE_REVIEW",
            severity: "info",
            category: "evidence",
            path: joinPath(basePath, "/evidence"),
            message:
                "Explain evidence is measured through a short MCQ. Review whether the question truly requires explanation rather than recall."
        });
    }

    if (
        evidence === "transfer" &&
        !HIGH_DIFFICULTIES.has(question.difficulty)
    ) {
        addIssue(report, {
            code: "CONTENT_QA_TRANSFER_DIFFICULTY_REVIEW",
            severity: "warning",
            category: "evidence",
            path: joinPath(basePath, "/difficulty"),
            message:
                "Transfer evidence is normally expected to involve a meaningfully changed context. Review unusually low difficulty."
        });
    }
}

/* =========================================================
 * MODES
 * ========================================================= */

function runModeChecks(question, report, basePath) {
    const modes = Array.isArray(question.mode)
        ? question.mode
        : [];

    for (const mode of modes) {
        if (!VALID_MODES.has(mode)) {
            continue;
        }
    }

    if (
        modes.includes("diagnostic") &&
        modes.includes("retest")
    ) {
        addIssue(report, {
            code: "CONTENT_QA_MODE_CONFLICT_REVIEW",
            severity: "warning",
            category: "mode",
            path: joinPath(basePath, "/mode"),
            message:
                "Question is simultaneously diagnostic and retest. Review whether this combination is intentional."
        });
    }

    if (
        modes.includes("remediation") &&
        question.failureSignatures?.length === 0
    ) {
        addIssue(report, {
            code: "CONTENT_QA_REMEDIATION_WITHOUT_FAILURE",
            severity: "warning",
            category: "mode",
            path: joinPath(basePath, "/failureSignatures"),
            message:
                "Remediation question has no failure signatures."
        });
    }
}

/* =========================================================
 * DIFFICULTY
 * ========================================================= */

function runDifficultyChecks(question, report, basePath) {
    const difficulty = question.difficulty;

    if (
        difficulty === "D1" &&
        question.evidence === "transfer"
    ) {
        addIssue(report, {
            code: "CONTENT_QA_DIFFICULTY_EVIDENCE_MISMATCH",
            severity: "warning",
            category: "difficulty",
            path: joinPath(basePath, "/difficulty"),
            message:
                "D1 transfer question should be manually reviewed for evidence/difficulty alignment."
        });
    }

    if (
        difficulty === "D5" &&
        question.evidence === "know"
    ) {
        addIssue(report, {
            code: "CONTENT_QA_DIFFICULTY_EVIDENCE_MISMATCH",
            severity: "warning",
            category: "difficulty",
            path: joinPath(basePath, "/difficulty"),
            message:
                "D5 know question should be manually reviewed for difficulty/evidence alignment."
        });
    }
}

/* =========================================================
 * TRANSFER
 * ========================================================= */

function runTransferChecks(question, report, basePath) {
    if (question.evidence !== "transfer") {
        return;
    }

    const context = question.context;

    if (!isPlainObject(context)) {
        return;
    }

    if (
        GENERIC_CONTEXT_TYPES.has(context.contextType)
    ) {
        addIssue(report, {
            code: "CONTENT_QA_TRANSFER_CONTEXT_WEAK",
            severity: "warning",
            category: "transfer",
            path: joinPath(basePath, "/context/contextType"),
            message:
                "Transfer evidence uses a direct context. Review whether the context is sufficiently different from routine practice."
        });
    }

    if (
        context.contextType &&
        !TRANSFER_CONTEXT_TYPES.has(context.contextType) &&
        !GENERIC_CONTEXT_TYPES.has(context.contextType)
    ) {
        return;
    }

    addReviewFlag(report, {
        code: "BIOLOGY_TRANSFER_REVIEW",
        category: "biology",
        message:
            "Verify that this question requires transfer to a genuinely changed biological context rather than routine application."
    });
}

/* =========================================================
 * RETEST
 * ========================================================= */

function runRetestChecks(question, report, basePath) {
    const modes = Array.isArray(question.mode)
        ? question.mode
        : [];

    if (!modes.includes("retest")) {
        return;
    }

    addReviewFlag(report, {
        code: "BIOLOGY_RETEST_EQUIVALENCE_REVIEW",
        category: "biology",
        message:
            "Verify that the retest measures the same primary node/evidence while using a sufficiently different question or context."
    });

    const contextId = question?.context?.contextId;
    const metadataContextId = question?.metadata?.contextId;

    if (
        contextId &&
        metadataContextId &&
        contextId !== metadataContextId
    ) {
        addIssue(report, {
            code: "CONTENT_QA_CONTEXT_METADATA_MISMATCH",
            severity: "warning",
            category: "retest",
            path: joinPath(basePath, "/metadata/contextId"),
            message:
                "metadata.contextId differs from context.contextId."
        });
    }

    const retestGroupId =
        question?.context?.retestGroupId;

    const metadataRetestGroupId =
        question?.metadata?.retestGroupId;

    if (
        retestGroupId &&
        metadataRetestGroupId &&
        retestGroupId !== metadataRetestGroupId
    ) {
        addIssue(report, {
            code: "CONTENT_QA_RETEST_GROUP_METADATA_MISMATCH",
            severity: "warning",
            category: "retest",
            path: joinPath(basePath, "/metadata/retestGroupId"),
            message:
                "metadata.retestGroupId differs from context.retestGroupId."
        });
    }
}

/* =========================================================
 * FAILURE SIGNATURES
 * ========================================================= */

function runFailureSignatureChecks(question, report, basePath) {
    const signatures = Array.isArray(question.failureSignatures)
        ? question.failureSignatures
        : [];

    if (signatures.length >= 4) {
        addIssue(report, {
            code: "CONTENT_QA_TOO_MANY_FAILURE_SIGNATURES",
            severity: "warning",
            category: "failure-diagnosis",
            path: joinPath(basePath, "/failureSignatures"),
            message:
                "Question has many possible failure signatures. Review whether failure attribution is becoming too broad."
        });
    }

    if (
        question.difficulty === "D1" &&
        signatures.includes("cross_node_reasoning_error")
    ) {
        addIssue(report, {
            code: "CONTENT_QA_FAILURE_SIGNATURE_REVIEW",
            severity: "warning",
            category: "failure-diagnosis",
            path: joinPath(basePath, "/failureSignatures"),
            message:
                "D1 question uses cross_node_reasoning_error. Review whether the question actually requires cross-node reasoning."
        });
    }
}

/* =========================================================
 * REMEDIATION CONTENT
 * ========================================================= */

function runRemediationChecks(question, report, basePath) {
    const modes = Array.isArray(question.mode)
        ? question.mode
        : [];

    if (!modes.includes("remediation")) {
        return;
    }

    const signatures = Array.isArray(question.failureSignatures)
        ? question.failureSignatures
        : [];

    const mapping =
        question?.remediation?.byFailureSignature;

    if (!isPlainObject(mapping)) {
        addIssue(report, {
            code: "CONTENT_QA_REMEDIATION_MAPPING_MISSING",
            severity: "warning",
            category: "remediation-content",
            path: joinPath(
                basePath,
                "/remediation/byFailureSignature"
            ),
            message:
                "Remediation-mode question has no failure-signature remediation mapping."
        });

        return;
    }

    for (const signature of signatures) {
        if (!mapping[signature]) {
            addIssue(report, {
                code: "CONTENT_QA_REMEDIATION_SIGNATURE_UNMAPPED",
                severity: "warning",
                category: "remediation-content",
                path: joinPath(
                    basePath,
                    "/remediation/byFailureSignature"
                ),
                message:
                    `Failure signature '${signature}' has no remediation content mapping.`
            });
        }
    }
}

/* =========================================================
 * METADATA
 * ========================================================= */

function runMetadataChecks(question, report, basePath) {
    const reviewStatus = question?.metadata?.reviewStatus;

    if (reviewStatus === "draft") {
        addReviewFlag(report, {
            code: "BIOLOGY_REVIEW_REQUIRED",
            category: "biology",
            message:
                "Question is still marked draft and requires Biology Content Review before production use."
        });
    }

    const estimatedTime =
        question?.metadata?.estimatedTimeSeconds;

    if (
        typeof estimatedTime === "number" &&
        estimatedTime > 300
    ) {
        addIssue(report, {
            code: "CONTENT_QA_ESTIMATED_TIME_HIGH",
            severity: "info",
            category: "metadata",
            path: joinPath(
                basePath,
                "/metadata/estimatedTimeSeconds"
            ),
            message:
                "Estimated question time exceeds five minutes."
        });
    }
}

/* =========================================================
 * NODE HEURISTICS
 * ========================================================= */

function runNodeHeuristics(
    question,
    knowledgeMap,
    report,
    basePath
) {
    if (!knowledgeMap) {
        return;
    }

    const primaryNodeId = question.primaryNode;

    if (!primaryNodeId) {
        return;
    }

    const node = findKnowledgeNode(
        knowledgeMap,
        primaryNodeId
    );

    if (!node) {
        return;
    }

    const nodeName =
        node.name ??
        node.title ??
        node.label ??
        null;

    if (nodeName) {
        addReviewFlag(report, {
            code: "BIOLOGY_NODE_ALIGNMENT_REVIEW",
            category: "biology",
            message:
                `Verify that the question directly measures ${primaryNodeId} (${nodeName}) rather than primarily measuring another node.`
        });
    } else {
        addReviewFlag(report, {
            code: "BIOLOGY_NODE_ALIGNMENT_REVIEW",
            category: "biology",
            message:
                `Verify that the question directly measures primary node ${primaryNodeId}.`
        });
    }

    if (
        HIGHER_ORDER_EVIDENCE.has(question.evidence) &&
        Array.isArray(question.secondaryNodes) &&
        question.secondaryNodes.length > 0
    ) {
        addReviewFlag(report, {
            code: "BIOLOGY_SECONDARY_NODE_REVIEW",
            category: "biology",
            message:
                "Verify that secondary nodes are supporting knowledge only and are not accidentally being treated as directly measured mastery evidence."
        });
    }
}

/* =========================================================
 * SCIENTIFIC REVIEW GATE
 * ========================================================= */

function runScientificReviewGate(question, report) {
    addReviewFlag(report, {
        code: "BIOLOGY_SCIENTIFIC_CORRECTNESS_REVIEW",
        category: "biology",
        message:
            "Verify scientific correctness of the stem, data, canonical answer, calculations, terminology, and explanation."
    });

    if (question.questionType === "mcq") {
        addReviewFlag(report, {
            code: "BIOLOGY_SINGLE_BEST_ANSWER_REVIEW",
            category: "biology",
            message:
                "Verify that exactly one option is scientifically defensible as the best answer and that every distractor is genuinely incorrect under the stated conditions."
        });
    }

    if (
        question?.content?.data !== null &&
        question?.content?.data !== undefined
    ) {
        addReviewFlag(report, {
            code: "BIOLOGY_DATA_CONSISTENCY_REVIEW",
            category: "biology",
            message:
                "Recalculate all supplied biological/numerical data and verify that they are internally consistent with the answer and explanation."
        });
    }
}

/* =========================================================
 * REPORT
 * ========================================================= */

function createReport(question, path) {
    return {
        validator: {
            name: VALIDATOR_NAME,
            version: VALIDATOR_VERSION
        },

        target: {
            type: "question-content",
            id: question?.id ?? null,
            path: path || null
        },

        valid: true,

        summary: {
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            reviewFlagCount: 0
        },

        issues: [],

        review: {
            required: false,
            flags: []
        }
    };
}

function addIssue(report, issue) {
    report.issues.push({
        code: issue.code,
        severity: issue.severity,
        category: issue.category,
        path: issue.path ?? null,
        message: issue.message
    });
}

function addReviewFlag(report, flag) {
    const exists = report.review.flags.some(
        item =>
            item.code === flag.code &&
            item.message === flag.message
    );

    if (exists) {
        return;
    }

    report.review.flags.push({
        code: flag.code,
        category: flag.category,
        message: flag.message
    });
}

function finalizeReport(report) {
    report.summary.errorCount =
        report.issues.filter(
            issue => issue.severity === "error"
        ).length;

    report.summary.warningCount =
        report.issues.filter(
            issue => issue.severity === "warning"
        ).length;

    report.summary.infoCount =
        report.issues.filter(
            issue => issue.severity === "info"
        ).length;

    report.summary.reviewFlagCount =
        report.review.flags.length;

    report.review.required =
        report.review.flags.length > 0;

    report.valid =
        report.summary.errorCount === 0;

    return report;
}

/* =========================================================
 * HELPERS
 * ========================================================= */

function findKnowledgeNode(knowledgeMap, nodeId) {
    if (!knowledgeMap) {
        return null;
    }

    if (Array.isArray(knowledgeMap.nodes)) {
        return (
            knowledgeMap.nodes.find(
                node => node?.id === nodeId
            ) ?? null
        );
    }

    if (isPlainObject(knowledgeMap.nodes)) {
        return knowledgeMap.nodes[nodeId] ?? null;
    }

    return null;
}

function getCorrectAnswerText(question) {
    if (question.questionType !== "mcq") {
        return null;
    }

    if (question?.answer?.type !== "single") {
        return null;
    }

    const option = question?.content?.options?.find(
        item => item?.id === question.answer.value
    );

    return option?.text ?? null;
}

function hasSuspiciousPlaceholder(value) {
    if (!isNonEmptyString(value)) {
        return false;
    }

    const normalized = value.toLowerCase();

    const markers = [
        "todo",
        "tbd",
        "fixme",
        "placeholder",
        "lorem ipsum",
        "xxx",
        "[điền",
        "[dien",
        "<insert",
        "<todo"
    ];

    return markers.some(marker =>
        normalized.includes(marker)
    );
}

function normalizeComparable(value) {

    return normalizeText(value)
        .normalize("NFC")
        .replace(/[.,;:!?()[\]{}"'`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(value) {
    return typeof value === "string"
        ? value.trim()
        : "";
}

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function joinPath(base, suffix) {
    if (!base) {
        return suffix;
    }

    return `${base}${suffix}`;
}

function escapeJsonPointer(value) {
    return String(value)
        .replace(/~/g, "~0")
        .replace(/\//g, "~1");
}