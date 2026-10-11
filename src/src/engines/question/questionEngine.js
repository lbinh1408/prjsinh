/**
 * Question Engine V1
 *
 * Responsibility:
 * - Load and index questions
 * - Validate question data against the current question contract
 * - Query questions by node / evidence / difficulty / type / mode / skill
 * - Filter questions according to selection criteria
 * - Exclude already-used questions
 * - Select a question candidate
 *
 * Does NOT:
 * - evaluate student answers
 * - calculate mastery
 * - update student state
 * - decide LEARN / PRACTICE / CHALLENGE / REMEDIATE
 * - create remediation plans
 *
 * Current Question Contract:
 *
 * {
 *   id: "Q-A-K283-A-001",
 *   version: "1.0.0",
 *
 *   nodes: ["K283"],
 *   primaryNode: "K283",
 *   secondaryNodes: ["K281", "K282"],
 *
 *   evidence: "apply",
 *   difficulty: "D3",
 *   questionType: "mcq",
 *   mode: ["practice", "diagnostic"],
 *   prerequisites: ["K281", "K282"],
 *   skills: ["S008"],
 *
 *   content: {
 *     stem: "...",
 *     context: null,
 *     options: [...],
 *     media: [],
 *     data: null
 *   },
 *
 *   answer: {
 *     type: "single",
 *     value: "B"
 *   },
 *
 *   scoring: {
 *     maxScore: 1,
 *     partialCredit: false,
 *     rubric: null
 *   },
 *
 *   failureSignatures: [...],
 *
 *   explanation: {
 *     correct: "...",
 *     incorrect: {
 *       A: "...",
 *       B: "..."
 *     }
 *   }
 * }
 */

class QuestionEngine {
    /**
     * @param {Array|Object} questions
     * @param {Object|null} knowledgeEngine
     */
    constructor(questions = [], knowledgeEngine = null) {
        this.knowledgeEngine = knowledgeEngine;

        this.questions = this.normalizeQuestions(questions);

        this.questionIndex = new Map();
        this.nodeIndex = new Map();
        this.primaryNodeIndex = new Map();
        this.secondaryNodeIndex = new Map();
        this.evidenceIndex = new Map();
        this.difficultyIndex = new Map();
        this.typeIndex = new Map();
        this.modeIndex = new Map();
        this.skillIndex = new Map();
        this.prerequisiteIndex = new Map();

        this.buildIndexes();
    }

    // =========================================================
    // NORMALIZATION
    // =========================================================

    /**
     * Supports:
     * - direct array
     * - { questions: [...] }
     *
     * Does not modify individual question objects.
     */
    normalizeQuestions(questions) {
        if (Array.isArray(questions)) {
            return questions;
        }

        if (
            questions &&
            typeof questions === "object" &&
            Array.isArray(questions.questions)
        ) {
            return questions.questions;
        }

        return [];
    }

    // =========================================================
    // INDEXING
    // =========================================================

    buildIndexes() {
        this.questionIndex.clear();
        this.nodeIndex.clear();
        this.primaryNodeIndex.clear();
        this.secondaryNodeIndex.clear();
        this.evidenceIndex.clear();
        this.difficultyIndex.clear();
        this.typeIndex.clear();
        this.modeIndex.clear();
        this.skillIndex.clear();
        this.prerequisiteIndex.clear();

        for (const question of this.questions) {
            if (!question || typeof question !== "object") {
                continue;
            }

            if (typeof question.id === "string" && question.id.trim()) {
                this.questionIndex.set(question.id, question);
            }

            this.indexMany(
                this.nodeIndex,
                question.nodes,
                question
            );

            this.indexOne(
                this.primaryNodeIndex,
                question.primaryNode,
                question
            );

            this.indexMany(
                this.secondaryNodeIndex,
                question.secondaryNodes,
                question
            );

            this.indexOne(
                this.evidenceIndex,
                question.evidence,
                question
            );

            this.indexOne(
                this.difficultyIndex,
                question.difficulty,
                question
            );

            this.indexOne(
                this.typeIndex,
                question.questionType,
                question
            );

            this.indexMany(
                this.modeIndex,
                question.mode,
                question
            );

            this.indexMany(
                this.skillIndex,
                question.skills,
                question
            );

            this.indexMany(
                this.prerequisiteIndex,
                question.prerequisites,
                question
            );
        }
    }

    indexOne(index, key, question) {
        if (typeof key !== "string" || !key.trim()) {
            return;
        }

        if (!index.has(key)) {
            index.set(key, new Set());
        }

        index.get(key).add(question);
    }

    indexMany(index, values, question) {
        if (!Array.isArray(values)) {
            return;
        }

        for (const value of values) {
            this.indexOne(index, value, question);
        }
    }

    // =========================================================
    // BASIC ACCESS
    // =========================================================

    getQuestion(questionId) {
        return this.questionIndex.get(questionId) || null;
    }

    hasQuestion(questionId) {
        return this.questionIndex.has(questionId);
    }

    getAllQuestions() {
        return [...this.questions];
    }

    getQuestionCount() {
        return this.questions.length;
    }

    // =========================================================
    // NODE QUERIES
    // =========================================================

    getQuestionsByNode(nodeId) {
        return this.setToArray(this.nodeIndex.get(nodeId));
    }

    getQuestionsByPrimaryNode(nodeId) {
        return this.setToArray(this.primaryNodeIndex.get(nodeId));
    }

    getQuestionsBySecondaryNode(nodeId) {
        return this.setToArray(this.secondaryNodeIndex.get(nodeId));
    }

    // =========================================================
    // ATTRIBUTE QUERIES
    // =========================================================

    getQuestionsByEvidence(evidence) {
        return this.setToArray(this.evidenceIndex.get(evidence));
    }

    getQuestionsByDifficulty(difficulty) {
        return this.setToArray(this.difficultyIndex.get(difficulty));
    }

    getQuestionsByType(questionType) {
        return this.setToArray(this.typeIndex.get(questionType));
    }

    getQuestionsByMode(mode) {
        return this.setToArray(this.modeIndex.get(mode));
    }

    getQuestionsBySkill(skillId) {
        return this.setToArray(this.skillIndex.get(skillId));
    }

    getQuestionsByPrerequisite(nodeId) {
        return this.setToArray(
            this.prerequisiteIndex.get(nodeId)
        );
    }

    // =========================================================
    // FILTERING
    // =========================================================

    /**
     * Filter questions according to selection criteria.
     *
     * Supported criteria:
     *
     * {
     *   nodeIds: [],
     *   primaryNodeIds: [],
     *   secondaryNodeIds: [],
     *   evidence: [],
     *   difficulty: [],
     *   questionTypes: [],
     *   modes: [],
     *   skills: [],
     *   prerequisites: [],
     *   excludeQuestionIds: [],
     *   requireDifferentQuestion: true,
     *   usedQuestionIds: []
     * }
     *
     * Also accepts singular values:
     * nodeId
     * primaryNode
     * evidenceDimension
     * questionType
     * mode
     * skill
     */
    filterQuestions(criteria = {}) {
        let candidates = this.getAllQuestions();

        const normalized = this.normalizeCriteria(criteria);

        if (normalized.nodeIds.length > 0) {
            candidates = candidates.filter((question) =>
                normalized.nodeIds.some((nodeId) =>
                    Array.isArray(question.nodes) &&
                    question.nodes.includes(nodeId)
                )
            );
        }

        if (normalized.primaryNodeIds.length > 0) {
            candidates = candidates.filter((question) =>
                normalized.primaryNodeIds.includes(question.primaryNode)
            );
        }

        if (normalized.secondaryNodeIds.length > 0) {
            candidates = candidates.filter((question) =>
                Array.isArray(question.secondaryNodes) &&
                normalized.secondaryNodeIds.some((nodeId) =>
                    question.secondaryNodes.includes(nodeId)
                )
            );
        }

        if (normalized.evidence.length > 0) {
            candidates = candidates.filter((question) =>
                normalized.evidence.includes(question.evidence)
            );
        }

        if (normalized.difficulty.length > 0) {
            candidates = candidates.filter((question) =>
                normalized.difficulty.includes(question.difficulty)
            );
        }

        if (normalized.questionTypes.length > 0) {
            candidates = candidates.filter((question) =>
                normalized.questionTypes.includes(question.questionType)
            );
        }

        if (normalized.modes.length > 0) {
            candidates = candidates.filter((question) =>
                Array.isArray(question.mode) &&
                normalized.modes.some((mode) =>
                    question.mode.includes(mode)
                )
            );
        }

        if (normalized.skills.length > 0) {
            candidates = candidates.filter((question) =>
                Array.isArray(question.skills) &&
                normalized.skills.some((skill) =>
                    question.skills.includes(skill)
                )
            );
        }

        if (normalized.prerequisites.length > 0) {
            candidates = candidates.filter((question) =>
                Array.isArray(question.prerequisites) &&
                normalized.prerequisites.some((nodeId) =>
                    question.prerequisites.includes(nodeId)
                )
            );
        }

        if (normalized.excludeQuestionIds.length > 0) {
            const excluded = new Set(
                normalized.excludeQuestionIds
            );

            candidates = candidates.filter(
                (question) => !excluded.has(question.id)
            );
        }

        if (normalized.usedQuestionIds.length > 0) {
            const used = new Set(
                normalized.usedQuestionIds
            );

            candidates = candidates.filter(
                (question) => !used.has(question.id)
            );
        }

        return candidates;
    }

    // =========================================================
    // QUESTION SELECTION
    // =========================================================

    /**
     * Select one question from candidates.
     *
     * Question Engine does NOT decide why the student should
     * receive the question. The caller supplies criteria.
     *
     * Selection strategy V1:
     * 1. Filter candidates
     * 2. Remove excluded/used questions
     * 3. Return first candidate by source order
     *
     * No adaptive scoring is performed here yet.
     */
    selectQuestion(criteria = {}) {
        const candidates = this.filterQuestions(criteria);

        if (candidates.length === 0) {
            return null;
        }

        return candidates[0];
    }

    /**
     * Return all matching candidates.
     */
    selectCandidates(criteria = {}) {
        return this.filterQuestions(criteria);
    }

    // =========================================================
    // CRITERIA NORMALIZATION
    // =========================================================

    normalizeCriteria(criteria = {}) {
        return {
            nodeIds: this.toArray(
                criteria.nodeIds ?? criteria.nodeId
            ),

            primaryNodeIds: this.toArray(
                criteria.primaryNodeIds ?? criteria.primaryNode
            ),

            secondaryNodeIds: this.toArray(
                criteria.secondaryNodeIds
            ),

            evidence: this.toArray(
                criteria.evidence ??
                criteria.evidenceDimension ??
                criteria.evidenceDimensions
            ),

            difficulty: this.toArray(
                criteria.difficulty ??
                criteria.difficulties
            ),

            questionTypes: this.toArray(
                criteria.questionTypes ??
                criteria.questionType
            ),

            modes: this.toArray(
                criteria.modes ??
                criteria.mode
            ),

            skills: this.toArray(
                criteria.skills ??
                criteria.skill
            ),

            prerequisites: this.toArray(
                criteria.prerequisites ??
                criteria.prerequisite
            ),

            excludeQuestionIds: this.toArray(
                criteria.excludeQuestionIds
            ),

            usedQuestionIds: this.toArray(
                criteria.usedQuestionIds
            )
        };
    }

    toArray(value) {
        if (value === undefined || value === null) {
            return [];
        }

        if (Array.isArray(value)) {
            return value.filter(
                (item) =>
                    typeof item === "string" &&
                    item.trim()
            );
        }

        if (typeof value === "string" && value.trim()) {
            return [value];
        }

        return [];
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    /**
     * Validate one question against the current real contract.
     *
     * Returns:
     * {
     *   valid: true/false,
     *   errors: [],
     *   warnings: []
     * }
     */
    validateQuestion(question) {
        const errors = [];
        const warnings = [];

        if (!question || typeof question !== "object") {
            return {
                valid: false,
                errors: ["Question must be an object."],
                warnings: []
            };
        }

        // -------------------------------------------------------
        // Identity
        // -------------------------------------------------------

        if (
            typeof question.id !== "string" ||
            !question.id.trim()
        ) {
            errors.push("Missing or invalid 'id'.");
        }

        if (
            typeof question.version !== "string" ||
            !question.version.trim()
        ) {
            errors.push("Missing or invalid 'version'.");
        }

        // -------------------------------------------------------
        // Knowledge targeting
        // -------------------------------------------------------

        if (!Array.isArray(question.nodes)) {
            errors.push("'nodes' must be an array.");
        }

        if (
            typeof question.primaryNode !== "string" ||
            !question.primaryNode.trim()
        ) {
            errors.push(
                "Missing or invalid 'primaryNode'."
            );
        }

        if (!Array.isArray(question.secondaryNodes)) {
            errors.push(
                "'secondaryNodes' must be an array."
            );
        }

        if (!Array.isArray(question.prerequisites)) {
            errors.push(
                "'prerequisites' must be an array."
            );
        }

        if (!Array.isArray(question.skills)) {
            errors.push("'skills' must be an array.");
        }

        // -------------------------------------------------------
        // Learning metadata
        // -------------------------------------------------------

        const validEvidence = [
            "know",
            "explain",
            "apply",
            "transfer"
        ];

        if (!validEvidence.includes(question.evidence)) {
            errors.push(
                `'evidence' must be one of: ${validEvidence.join(", ")}.`
            );
        }

        const validDifficulty = [
            "D1",
            "D2",
            "D3",
            "D4",
            "D5"
        ];

        if (!validDifficulty.includes(question.difficulty)) {
            errors.push(
                `'difficulty' must be one of: ${validDifficulty.join(", ")}.`
            );
        }

        if (
            typeof question.questionType !== "string" ||
            !question.questionType.trim()
        ) {
            errors.push(
                "Missing or invalid 'questionType'."
            );
        }

        if (!Array.isArray(question.mode)) {
            errors.push("'mode' must be an array.");
        }

        // -------------------------------------------------------
        // Content
        // -------------------------------------------------------

        if (
            !question.content ||
            typeof question.content !== "object"
        ) {
            errors.push("'content' must be an object.");
        } else {
            if (
                typeof question.content.stem !== "string" ||
                !question.content.stem.trim()
            ) {
                errors.push(
                    "'content.stem' must be a non-empty string."
                );
            }

            if (!Array.isArray(question.content.options)) {
                errors.push(
                    "'content.options' must be an array."
                );
            } else {
                this.validateOptions(
                    question.content.options,
                    errors,
                    warnings
                );
            }

            if (!Array.isArray(question.content.media)) {
                errors.push(
                    "'content.media' must be an array."
                );
            }
        }

        // -------------------------------------------------------
        // Answer
        // -------------------------------------------------------

        if (
            !question.answer ||
            typeof question.answer !== "object"
        ) {
            errors.push("'answer' must be an object.");
        } else {
            if (
                typeof question.answer.type !== "string" ||
                !question.answer.type.trim()
            ) {
                errors.push(
                    "'answer.type' must be a non-empty string."
                );
            }

            if (
                question.answer.value === undefined ||
                question.answer.value === null
            ) {
                errors.push(
                    "'answer.value' is required."
                );
            }
        }

        // -------------------------------------------------------
        // Scoring
        // -------------------------------------------------------

        if (
            !question.scoring ||
            typeof question.scoring !== "object"
        ) {
            errors.push("'scoring' must be an object.");
        } else {
            if (
                typeof question.scoring.maxScore !== "number" ||
                question.scoring.maxScore < 0
            ) {
                errors.push(
                    "'scoring.maxScore' must be a non-negative number."
                );
            }

            if (
                typeof question.scoring.partialCredit !== "boolean"
            ) {
                errors.push(
                    "'scoring.partialCredit' must be boolean."
                );
            }

            if (
                question.scoring.partialCredit === true &&
                question.scoring.rubric === null
            ) {
                warnings.push(
                    "partialCredit is true but scoring.rubric is null."
                );
            }
        }

        // -------------------------------------------------------
        // Failure signatures
        // -------------------------------------------------------

        if (!Array.isArray(question.failureSignatures)) {
            errors.push(
                "'failureSignatures' must be an array."
            );
        }

        // -------------------------------------------------------
        // Explanation
        // -------------------------------------------------------

        if (
            !question.explanation ||
            typeof question.explanation !== "object"
        ) {
            errors.push(
                "'explanation' must be an object."
            );
        } else {
            if (
                typeof question.explanation.correct !== "string"
            ) {
                errors.push(
                    "'explanation.correct' must be a string."
                );
            }

            if (
                !question.explanation.incorrect ||
                typeof question.explanation.incorrect !== "object"
            ) {
                errors.push(
                    "'explanation.incorrect' must be an object."
                );
            }
        }

        // -------------------------------------------------------
        // Cross-field consistency
        // -------------------------------------------------------

        this.validateCrossFieldConsistency(
            question,
            errors,
            warnings
        );

        // -------------------------------------------------------
        // Knowledge Engine integration
        // -------------------------------------------------------

        if (this.knowledgeEngine) {
            this.validateKnowledgeReferences(
                question,
                errors,
                warnings
            );
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    validateOptions(options, errors, warnings) {
        const optionIds = new Set();
        let correctCount = 0;

        for (const option of options) {
            if (!option || typeof option !== "object") {
                errors.push(
                    "Each content option must be an object."
                );
                continue;
            }

            if (
                typeof option.id !== "string" ||
                !option.id.trim()
            ) {
                errors.push(
                    "Each option must have a valid 'id'."
                );
            } else if (optionIds.has(option.id)) {
                errors.push(
                    `Duplicate option id '${option.id}'.`
                );
            } else {
                optionIds.add(option.id);
            }

            if (
                typeof option.text !== "string"
            ) {
                errors.push(
                    `Option '${option.id ?? "unknown"}' must have text.`
                );
            }

            if (
                typeof option.isCorrect !== "boolean"
            ) {
                errors.push(
                    `Option '${option.id ?? "unknown"}' must have boolean 'isCorrect'.`
                );
            }

            if (option.isCorrect === true) {
                correctCount += 1;
            }
        }

        if (options.length > 0 && correctCount === 0) {
            errors.push(
                "At least one option must have isCorrect=true."
            );
        }

        if (correctCount > 1) {
            warnings.push(
                "Multiple options have isCorrect=true."
            );
        }
    }

    validateCrossFieldConsistency(
        question,
        errors,
        warnings
    ) {
        // -------------------------------------------------------
        // primaryNode should normally belong to nodes.
        // -------------------------------------------------------

        if (
            Array.isArray(question.nodes) &&
            typeof question.primaryNode === "string" &&
            !question.nodes.includes(question.primaryNode)
        ) {
            errors.push(
                "'primaryNode' must be included in 'nodes'."
            );
        }

        // -------------------------------------------------------
        // primaryNode should not also be secondaryNode.
        // -------------------------------------------------------

        if (
            Array.isArray(question.secondaryNodes) &&
            question.secondaryNodes.includes(question.primaryNode)
        ) {
            errors.push(
                "'primaryNode' cannot also appear in 'secondaryNodes'."
            );
        }

        // -------------------------------------------------------
        // Prerequisite duplicates.
        // -------------------------------------------------------

        if (Array.isArray(question.prerequisites)) {
            const unique = new Set(
                question.prerequisites
            );

            if (
                unique.size !== question.prerequisites.length
            ) {
                warnings.push(
                    "'prerequisites' contains duplicate node IDs."
                );
            }
        }

        // -------------------------------------------------------
        // Answer consistency for MCQ.
        // -------------------------------------------------------

        if (
            question.questionType === "mcq" &&
            question.content &&
            Array.isArray(question.content.options) &&
            question.answer
        ) {
            const optionIds = new Set(
                question.content.options.map(
                    (option) => option.id
                )
            );

            if (
                question.answer.type === "single" &&
                !optionIds.has(question.answer.value)
            ) {
                errors.push(
                    "'answer.value' must match an option id for single-answer MCQ."
                );
            }

            const correctOptionIds =
                question.content.options
                    .filter((option) => option.isCorrect)
                    .map((option) => option.id);

            if (
                question.answer.type === "single" &&
                correctOptionIds.length === 1 &&
                correctOptionIds[0] !== question.answer.value
            ) {
                errors.push(
                    "'answer.value' conflicts with content.options[].isCorrect."
                );
            }
        }

        // -------------------------------------------------------
        // Evidence / difficulty sanity checks.
        // These are warnings, not hard schema errors.
        // -------------------------------------------------------

        const expectedEvidenceByDifficulty = {
            D1: ["know"],
            D2: ["know", "explain"],
            D3: ["explain", "apply"],
            D4: ["apply", "transfer"],
            D5: ["transfer"]
        };

        if (
            expectedEvidenceByDifficulty[question.difficulty] &&
            !expectedEvidenceByDifficulty[
                question.difficulty
            ].includes(question.evidence)
        ) {
            warnings.push(
                `Evidence '${question.evidence}' may be unusual for difficulty '${question.difficulty}'.`
            );
        }

        // -------------------------------------------------------
        // Answer/scoring consistency.
        // -------------------------------------------------------

        if (
            question.scoring &&
            question.scoring.partialCredit === false &&
            question.scoring.rubric !== null
        ) {
            warnings.push(
                "A rubric is present while partialCredit is false."
            );
        }
    }

    validateKnowledgeReferences(
        question,
        errors,
        warnings
    ) {
        const referencedNodes = new Set();

        if (Array.isArray(question.nodes)) {
            for (const nodeId of question.nodes) {
                referencedNodes.add(nodeId);
            }
        }

        if (question.primaryNode) {
            referencedNodes.add(question.primaryNode);
        }

        if (Array.isArray(question.secondaryNodes)) {
            for (const nodeId of question.secondaryNodes) {
                referencedNodes.add(nodeId);
            }
        }

        if (Array.isArray(question.prerequisites)) {
            for (const nodeId of question.prerequisites) {
                referencedNodes.add(nodeId);
            }
        }

        for (const nodeId of referencedNodes) {
            if (
                !this.knowledgeEngine.hasNode(nodeId)
            ) {
                errors.push(
                    `Unknown knowledge node '${nodeId}'.`
                );
            }
        }
    }

    /**
     * Validate every question.
     */
    validateAll() {
        const results = [];
        let validCount = 0;
        let invalidCount = 0;

        for (const question of this.questions) {
            const result = this.validateQuestion(question);

            results.push({
                questionId: question?.id ?? null,
                ...result
            });

            if (result.valid) {
                validCount += 1;
            } else {
                invalidCount += 1;
            }
        }

        return {
            valid: invalidCount === 0,
            total: this.questions.length,
            validCount,
            invalidCount,
            results
        };
    }

    // =========================================================
    // UTILITY
    // =========================================================

    setToArray(set) {
        if (!set) {
            return [];
        }

        return [...set];
    }

    /**
     * Return a lightweight summary.
     */
    getSummary() {
        const evidence = {};
        const difficulty = {};
        const questionTypes = {};
        const modes = {};
        const primaryNodes = {};

        for (const question of this.questions) {
            this.increment(evidence, question.evidence);
            this.increment(difficulty, question.difficulty);
            this.increment(
                questionTypes,
                question.questionType
            );

            if (Array.isArray(question.mode)) {
                for (const mode of question.mode) {
                    this.increment(modes, mode);
                }
            }

            this.increment(
                primaryNodes,
                question.primaryNode
            );
        }

        return {
            totalQuestions: this.questions.length,
            evidence,
            difficulty,
            questionTypes,
            modes,
            primaryNodes
        };
    }

    increment(object, key) {
        if (
            typeof key !== "string" ||
            !key.trim()
        ) {
            return;
        }

        object[key] = (object[key] || 0) + 1;
    }
}

// ===========================================================
// FACTORY
// ===========================================================

function createQuestionEngine(
    questions = [],
    knowledgeEngine = null
) {
    return new QuestionEngine(
        questions,
        knowledgeEngine
    );
}

// ===========================================================
// EXPORTS
// ===========================================================

export {
    QuestionEngine,
    createQuestionEngine
};

export default QuestionEngine;
