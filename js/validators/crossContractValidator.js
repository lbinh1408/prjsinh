/*
 * crossContractValidator.js
 *
 * Phase 1 — Data Validation Layer
 *
 * Version: 1.0.0
 *
 * Responsibility:
 *
 *   READ → COMPARE → REPORT
 *
 * Validates consistency BETWEEN individually-valid artifacts.
 *
 * It does NOT replace:
 *
 *   - knowledgeValidator
 *   - questionValidator
 *   - attemptValidator
 *   - studentStateValidator
 *   - lessonValidator
 *   - eventValidator
 *
 * Assumption:
 *
 *   Individual artifacts have already passed
 *   their own validators.
 *
 * CrossContractValidator answers:
 *
 *   "Do these valid artifacts agree with each other?"
 *
 * MUST NOT:
 *
 *   - mutate inputs
 *   - re-run full schema validation
 *   - update mastery
 *   - choose next action
 *   - diagnose remediation
 *   - rebuild Student State
 *   - perform Analytics
 *   - infer missing data
 */


const VALIDATOR_NAME =
    "cross-contract-validator";

const VALIDATOR_VERSION =
    "1.0.0";


/* =========================================================
 * Canonical cross-contract codes
 * ========================================================= */


const CROSS_CONTRACT_CODES = new Set([
    "CONTRACT_EVIDENCE_MISMATCH",
    "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
    "CONTRACT_NODE_REFERENCE_MISMATCH",
    "CONTRACT_SKILL_REFERENCE_MISMATCH",
    "CONTRACT_ACTION_MISMATCH",
    "CONTRACT_VERSION_INCOMPATIBLE"
]);


/* =========================================================
 * Canonical domains
 * ========================================================= */


const EVIDENCE_VALUES = new Set([
    "know",
    "explain",
    "apply",
    "transfer"
]);


const ACTIONS = new Set([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);


const FAILURE_TYPES = new Set([
    "prerequisite_gap",
    "concept_confusion",
    "mechanism_confusion",
    "calculation_error",
    "data_interpretation_error",
    "reasoning_error",
    "cross_node_reasoning_error",
    "careless_error",
    "source_knowledge_gap",
    "meta_skill_gap"
]);


/* =========================================================
 * Fallback error metadata
 * ========================================================= */


const FALLBACK_ERROR_METADATA = {

    CONTRACT_EVIDENCE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_FAILURE_SIGNATURE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_NODE_REFERENCE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_SKILL_REFERENCE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_ACTION_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_VERSION_INCOMPATIBLE: {
        severity: "error",
        category: "contract"
    }
};


/* =========================================================
 * Public API
 * ========================================================= */


/**
 * Validate consistency between artifacts.
 *
 * Expected input:
 *
 * {
 *   knowledgeMap,
 *   questions,
 *   attempts,
 *   events,
 *   studentState,
 *   lessons,
 *   failureRegistry
 * }
 *
 * Every artifact is optional.
 *
 * Validator checks only relationships for which
 * both sides are available.
 */
export function validateCrossContract(
    artifacts = {},
    options = {}
) {

    const startedAt =
        Date.now();


    const context =
        createContext(
            artifacts,
            options
        );


    /*
     * Question ↔ Knowledge
     */
    validateQuestionsAgainstKnowledge(
        context
    );


    /*
     * Attempt ↔ Question
     */
    validateAttemptsAgainstQuestions(
        context
    );


    /*
     * Attempt ↔ Knowledge
     */
    validateAttemptsAgainstKnowledge(
        context
    );


    /*
     * Event ↔ Question / Attempt / Knowledge
     */
    validateEvents(
        context
    );


    /*
     * Failure Signature consistency
     */
    validateFailureReferences(
        context
    );


    /*
     * Student State ↔ Knowledge
     *
     * Only cross-artifact references.
     * No mastery logic.
     */
    validateStudentStateReferences(
        context
    );


    /*
     * Lesson ↔ Knowledge
     *
     * Only cross-artifact references.
     */
    validateLessonReferences(
        context
    );


    return buildReport(
        context,
        startedAt
    );
}


/* =========================================================
 * Context / indexes
 * ========================================================= */


function createContext(
    artifacts,
    options
) {

    const normalized = {

        knowledgeMap:
            artifacts.knowledgeMap ??
            null,

        questions:
            normalizeCollection(
                artifacts.questions
            ),

        attempts:
            normalizeCollection(
                artifacts.attempts
            ),

        events:
            normalizeCollection(
                artifacts.events
            ),

        lessons:
            normalizeCollection(
                artifacts.lessons
            ),

        studentState:
            artifacts.studentState ??
            null,

        failureRegistry:
            artifacts.failureRegistry ??
            null
    };


    return {

        artifacts:
            normalized,

        options,

        issues: [],

        errorRegistry:
            options.errorRegistry ??
            null,

        indexes: {

            nodes:
                buildNodeIndex(
                    normalized.knowledgeMap
                ),

            skills:
                buildSkillIndex(
                    normalized.knowledgeMap
                ),

            questions:
                buildIdMap(
                    normalized.questions,
                    "id"
                ),

            attempts:
                buildIdMap(
                    normalized.attempts,
                    "attemptId"
                ),

            events:
                buildIdMap(
                    normalized.events,
                    "eventId"
                ),

            lessons:
                buildIdMap(
                    normalized.lessons,
                    "id"
                ),

            failureSignatures:
                buildFailureIndex(
                    normalized.failureRegistry
                )
        }
    };
}


/* =========================================================
 * Question ↔ Knowledge
 * ========================================================= */


function validateQuestionsAgainstKnowledge(
    context
) {

    if (
        context.indexes.nodes.size === 0
    ) {
        return;
    }


    for (
        let i = 0;
        i <
        context.artifacts.questions.length;
        i++
    ) {

        const question =
            context.artifacts.questions[i];


        if (!isPlainObject(question)) {
            continue;
        }


        /*
         * Directly measured nodes.
         */
        if (Array.isArray(question.nodes)) {

            question.nodes.forEach(
                (nodeId, nodeIndex) => {

                    compareNodeExists(
                        context,
                        nodeId,
                        `/questions/${i}/nodes/${nodeIndex}`
                    );
                }
            );
        }


        /*
         * Primary node.
         */
        if (
            isNonEmptyString(
                question.primaryNode
            )
        ) {

            compareNodeExists(
                context,
                question.primaryNode,
                `/questions/${i}/primaryNode`
            );


            /*
             * primaryNode must be one of
             * directly measured nodes.
             */
            if (
                Array.isArray(question.nodes) &&
                !question.nodes.includes(
                    question.primaryNode
                )
            ) {

                addIssue(
                    context,
                    "CONTRACT_NODE_REFERENCE_MISMATCH",
                    `/questions/${i}/primaryNode`,
                    question.primaryNode,
                    question.nodes,
                    `Question '${question.id}' primaryNode is not included in its directly measured nodes.`
                );
            }
        }


        /*
         * Secondary nodes.
         */
        if (
            Array.isArray(
                question.secondaryNodes
            )
        ) {

            question.secondaryNodes.forEach(
                (nodeId, nodeIndex) => {

                    compareNodeExists(
                        context,
                        nodeId,
                        `/questions/${i}/secondaryNodes/${nodeIndex}`
                    );
                }
            );
        }


        /*
         * Prerequisites.
         */
        if (
            Array.isArray(
                question.prerequisites
            )
        ) {

            question.prerequisites.forEach(
                (nodeId, nodeIndex) => {

                    compareNodeExists(
                        context,
                        nodeId,
                        `/questions/${i}/prerequisites/${nodeIndex}`
                    );
                }
            );
        }


        /*
         * Skills.
         */
        if (
            Array.isArray(
                question.skills
            ) &&
            context.indexes.skills.size > 0
        ) {

            question.skills.forEach(
                (skillId, skillIndex) => {

                    if (
                        isNonEmptyString(skillId) &&
                        !context.indexes.skills.has(
                            skillId
                        )
                    ) {

                        addIssue(
                            context,
                            "CONTRACT_SKILL_REFERENCE_MISMATCH",
                            `/questions/${i}/skills/${skillIndex}`,
                            skillId,
                            "existing canonical skill ID",
                            `Question '${question.id}' references unknown skill '${skillId}'.`
                        );
                    }
                }
            );
        }
    }
}


/* =========================================================
 * Attempt ↔ Question
 * ========================================================= */


function validateAttemptsAgainstQuestions(
    context
) {

    if (
        context.indexes.questions.size === 0
    ) {
        return;
    }


    for (
        let i = 0;
        i <
        context.artifacts.attempts.length;
        i++
    ) {

        const attempt =
            context.artifacts.attempts[i];


        if (!isPlainObject(attempt)) {
            continue;
        }


        const questionId =
            attempt.questionId;


        if (!isNonEmptyString(questionId)) {
            continue;
        }


        const question =
            context.indexes.questions.get(
                questionId
            );


        /*
         * Individual Attempt Validator handles
         * missing Question references.
         *
         * Cross validator compares only when
         * both artifacts are available.
         */
        if (!isPlainObject(question)) {
            continue;
        }


        /*
         * Primary node consistency.
         *
         * Attempt schemas may store this under:
         *
         * attempt.nodeId
         * attempt.primaryNode
         * attempt.evidence.primaryNode
         *
         * We only compare fields that actually exist.
         */
        const attemptPrimaryNode =
            firstDefinedString([
                attempt.primaryNode,
                attempt.nodeId,
                attempt.evidence?.primaryNode
            ]);


        if (
            isNonEmptyString(
                attemptPrimaryNode
            ) &&
            isNonEmptyString(
                question.primaryNode
            ) &&
            attemptPrimaryNode !==
            question.primaryNode
        ) {

            addIssue(
                context,
                "CONTRACT_NODE_REFERENCE_MISMATCH",
                `/attempts/${i}`,
                attemptPrimaryNode,
                question.primaryNode,
                `Attempt '${attempt.attemptId}' node does not match Question '${question.id}' primaryNode.`
            );
        }


        /*
         * Evidence consistency.
         *
         * Canonical rule:
         *
         * primaryDimension = none
         *     → no direct mastery evidence
         *
         * otherwise:
         *     Attempt primaryDimension
         *     must equal Question evidence.
         */
        const attemptEvidence =
            attempt.evidence
                ?.primaryDimension;


        if (
            isNonEmptyString(
                attemptEvidence
            ) &&
            attemptEvidence !== "none" &&
            EVIDENCE_VALUES.has(
                attemptEvidence
            ) &&
            isNonEmptyString(
                question.evidence
            ) &&
            attemptEvidence !==
            question.evidence
        ) {

            addIssue(
                context,
                "CONTRACT_EVIDENCE_MISMATCH",
                `/attempts/${i}/evidence/primaryDimension`,
                attemptEvidence,
                question.evidence,
                `Attempt '${attempt.attemptId}' evidence '${attemptEvidence}' does not match Question '${question.id}' evidence '${question.evidence}'.`
            );
        }


        /*
         * Difficulty consistency.
         */
        const attemptDifficulty =
            attempt.evidence
                ?.difficulty;


        if (
            isNonEmptyString(
                attemptDifficulty
            ) &&
            isNonEmptyString(
                question.difficulty
            ) &&
            attemptDifficulty !==
            question.difficulty
        ) {

            /*
             * Registry currently has no dedicated
             * CONTRACT_DIFFICULTY_MISMATCH.
             *
             * Do NOT invent one here.
             *
             * Difficulty mismatch is therefore
             * intentionally deferred until registry
             * is extended or another contract owns it.
             */
        }


        /*
         * Failure signature consistency.
         *
         * If Attempt diagnosed a specific canonical
         * signature and Question declares allowed
         * failure signatures, it must be one of them.
         */
        const attemptFailureSignature =
            getAttemptFailureSignatureId(
                attempt
            );


        if (
            isNonEmptyString(
                attemptFailureSignature
            ) &&
            Array.isArray(
                question.failureSignatures
            ) &&
            question.failureSignatures.length > 0 &&
            !question.failureSignatures.includes(
                attemptFailureSignature
            )
        ) {

            addIssue(
                context,
                "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
                `/attempts/${i}`,
                attemptFailureSignature,
                question.failureSignatures,
                `Attempt '${attempt.attemptId}' failureSignatureId is not declared by Question '${question.id}'.`
            );
        }
    }
}


/* =========================================================
 * Attempt ↔ Knowledge
 * ========================================================= */


function validateAttemptsAgainstKnowledge(
    context
) {

    if (
        context.indexes.nodes.size === 0
    ) {
        return;
    }


    for (
        let i = 0;
        i <
        context.artifacts.attempts.length;
        i++
    ) {

        const attempt =
            context.artifacts.attempts[i];


        if (!isPlainObject(attempt)) {
            continue;
        }


        const nodeCandidates = [

            {
                value:
                    attempt.nodeId,

                path:
                    `/attempts/${i}/nodeId`
            },

            {
                value:
                    attempt.primaryNode,

                path:
                    `/attempts/${i}/primaryNode`
            },

            {
                value:
                    attempt.evidence
                        ?.primaryNode,

                path:
                    `/attempts/${i}/evidence/primaryNode`
            },

            {
                value:
                    attempt.diagnostic
                        ?.sourceNodeId,

                path:
                    `/attempts/${i}/diagnostic/sourceNodeId`
            }
        ];


        for (
            const candidate
            of nodeCandidates
        ) {

            if (
                isNonEmptyString(
                    candidate.value
                )
            ) {

                compareNodeExists(
                    context,
                    candidate.value,
                    candidate.path
                );
            }
        }
    }
}


/* =========================================================
 * Event cross-contract validation
 * ========================================================= */


function validateEvents(
    context
) {

    for (
        let i = 0;
        i <
        context.artifacts.events.length;
        i++
    ) {

        const event =
            context.artifacts.events[i];


        if (!isPlainObject(event)) {
            continue;
        }


        validateEventAgainstKnowledge(
            context,
            event,
            i
        );


        validateEventAgainstQuestion(
            context,
            event,
            i
        );


        validateEventAgainstAttempt(
            context,
            event,
            i
        );


        validateEventActionConsistency(
            context,
            event,
            i
        );
    }
}


/* =========================================================
 * Event ↔ Knowledge
 * ========================================================= */


function validateEventAgainstKnowledge(
    context,
    event,
    eventIndex
) {

    if (
        context.indexes.nodes.size === 0
    ) {
        return;
    }


    const eventContext =
        event.context;


    if (!isPlainObject(eventContext)) {
        return;
    }


    if (
        isNonEmptyString(
            eventContext.nodeId
        )
    ) {

        compareNodeExists(
            context,
            eventContext.nodeId,
            `/events/${eventIndex}/context/nodeId`
        );
    }


    if (
        Array.isArray(
            eventContext.secondaryNodeIds
        )
    ) {

        eventContext.secondaryNodeIds
            .forEach(
                (nodeId, index) => {

                    compareNodeExists(
                        context,
                        nodeId,
                        `/events/${eventIndex}/context/secondaryNodeIds/${index}`
                    );
                }
            );
    }


    if (
        isNonEmptyString(
            event.payload?.sourceNodeId
        )
    ) {

        compareNodeExists(
            context,
            event.payload.sourceNodeId,
            `/events/${eventIndex}/payload/sourceNodeId`
        );
    }


    const skillCandidates = [

        {
            value:
                eventContext.metaSkillId,

            path:
                `/events/${eventIndex}/context/metaSkillId`
        },

        {
            value:
                event.payload
                    ?.metaSkillId,

            path:
                `/events/${eventIndex}/payload/metaSkillId`
        }
    ];


    if (
        context.indexes.skills.size > 0
    ) {

        for (
            const candidate
            of skillCandidates
        ) {

            if (
                isNonEmptyString(
                    candidate.value
                ) &&
                !context.indexes.skills.has(
                    candidate.value
                )
            ) {

                addIssue(
                    context,
                    "CONTRACT_SKILL_REFERENCE_MISMATCH",
                    candidate.path,
                    candidate.value,
                    "existing canonical skill ID",
                    `Event '${event.eventId}' references unknown skill '${candidate.value}'.`
                );
            }
        }
    }
}


/* =========================================================
 * Event ↔ Question
 * ========================================================= */


function validateEventAgainstQuestion(
    context,
    event,
    eventIndex
) {

    const questionId =
        event.context?.questionId;


    if (
        !isNonEmptyString(questionId) ||
        context.indexes.questions.size === 0
    ) {
        return;
    }


    const question =
        context.indexes.questions.get(
            questionId
        );


    if (!isPlainObject(question)) {

        /*
         * Missing question is owned by
         * Event Validator / Question reference layer.
         */
        return;
    }


    /*
     * nodeId represents Question primary node
     * when both are recorded.
     */
    if (
        isNonEmptyString(
            event.context?.nodeId
        ) &&
        isNonEmptyString(
            question.primaryNode
        ) &&
        event.context.nodeId !==
        question.primaryNode
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            `/events/${eventIndex}/context/nodeId`,
            event.context.nodeId,
            question.primaryNode,
            `Event '${event.eventId}' nodeId does not match Question '${question.id}' primaryNode.`
        );
    }


    /*
     * secondaryNodeIds may only contain canonical
     * Question secondaryNodes.
     *
     * We do not require Event to copy every
     * secondary node.
     */
    if (
        Array.isArray(
            event.context?.secondaryNodeIds
        ) &&
        Array.isArray(
            question.secondaryNodes
        )
    ) {

        const expected =
            new Set(
                question.secondaryNodes
            );


        event.context.secondaryNodeIds
            .forEach(
                (nodeId, index) => {

                    if (
                        isNonEmptyString(nodeId) &&
                        !expected.has(nodeId)
                    ) {

                        addIssue(
                            context,
                            "CONTRACT_NODE_REFERENCE_MISMATCH",
                            `/events/${eventIndex}/context/secondaryNodeIds/${index}`,
                            nodeId,
                            question.secondaryNodes,
                            `Event '${event.eventId}' secondary node '${nodeId}' is not declared by Question '${question.id}'.`
                        );
                    }
                }
            );
    }


    /*
     * Event failureSignatureId vs Question.
     */
    const signatureId =
        event.payload
            ?.failureSignatureId;


    if (
        isNonEmptyString(signatureId) &&
        Array.isArray(
            question.failureSignatures
        ) &&
        question.failureSignatures.length > 0 &&
        !question.failureSignatures.includes(
            signatureId
        )
    ) {

        addIssue(
            context,
            "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
            `/events/${eventIndex}/payload/failureSignatureId`,
            signatureId,
            question.failureSignatures,
            `Event '${event.eventId}' failureSignatureId is not declared by Question '${question.id}'.`
        );
    }
}


/* =========================================================
 * Event ↔ Attempt
 * ========================================================= */


function validateEventAgainstAttempt(
    context,
    event,
    eventIndex
) {

    const attemptId =
        event.correlation
            ?.attemptId;


    if (
        !isNonEmptyString(attemptId) ||
        context.indexes.attempts.size === 0
    ) {
        return;
    }


    const attempt =
        context.indexes.attempts.get(
            attemptId
        );


    if (!isPlainObject(attempt)) {

        /*
         * Missing Attempt reference is not emitted
         * here because registry currently has no
         * CONTRACT_ATTEMPT_REFERENCE_MISMATCH.
         */
        return;
    }


    /*
     * Question identity must agree.
     */
    if (
        isNonEmptyString(
            event.context?.questionId
        ) &&
        isNonEmptyString(
            attempt.questionId
        ) &&
        event.context.questionId !==
        attempt.questionId
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            `/events/${eventIndex}/context/questionId`,
            event.context.questionId,
            attempt.questionId,
            `Event '${event.eventId}' questionId does not match correlated Attempt '${attempt.attemptId}' questionId.`
        );
    }


    /*
     * Primary node must agree where both
     * artifacts record it.
     */
    const attemptNode =
        firstDefinedString([
            attempt.primaryNode,
            attempt.nodeId,
            attempt.evidence?.primaryNode
        ]);


    if (
        isNonEmptyString(
            event.context?.nodeId
        ) &&
        isNonEmptyString(
            attemptNode
        ) &&
        event.context.nodeId !==
        attemptNode
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            `/events/${eventIndex}/context/nodeId`,
            event.context.nodeId,
            attemptNode,
            `Event '${event.eventId}' nodeId does not match correlated Attempt '${attempt.attemptId}'.`
        );
    }


    /*
     * Failure type consistency.
     */
    const attemptFailureType =
        getAttemptFailureType(
            attempt
        );


    if (
        isNonEmptyString(
            event.payload?.failureType
        ) &&
        isNonEmptyString(
            attemptFailureType
        ) &&
        event.payload.failureType !==
        attemptFailureType
    ) {

        addIssue(
            context,
            "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
            `/events/${eventIndex}/payload/failureType`,
            event.payload.failureType,
            attemptFailureType,
            `Event '${event.eventId}' failureType does not match correlated Attempt '${attempt.attemptId}'.`
        );
    }


    /*
     * Specific failure signature consistency.
     */
    const attemptSignature =
        getAttemptFailureSignatureId(
            attempt
        );


    if (
        isNonEmptyString(
            event.payload
                ?.failureSignatureId
        ) &&
        isNonEmptyString(
            attemptSignature
        ) &&
        event.payload.failureSignatureId !==
        attemptSignature
    ) {

        addIssue(
            context,
            "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
            `/events/${eventIndex}/payload/failureSignatureId`,
            event.payload.failureSignatureId,
            attemptSignature,
            `Event '${event.eventId}' failureSignatureId does not match correlated Attempt '${attempt.attemptId}'.`
        );
    }


    /*
     * Source node consistency.
     */
    const attemptSourceNode =
        getAttemptSourceNodeId(
            attempt
        );


    if (
        isNonEmptyString(
            event.payload
                ?.sourceNodeId
        ) &&
        isNonEmptyString(
            attemptSourceNode
        ) &&
        event.payload.sourceNodeId !==
        attemptSourceNode
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            `/events/${eventIndex}/payload/sourceNodeId`,
            event.payload.sourceNodeId,
            attemptSourceNode,
            `Event '${event.eventId}' sourceNodeId does not match correlated Attempt '${attempt.attemptId}'.`
        );
    }
}


/* =========================================================
 * Event action consistency
 * ========================================================= */


function validateEventActionConsistency(
    context,
    event,
    eventIndex
) {

    const contextAction =
        event.context?.action;

    const payloadAction =
        event.payload?.action;


    if (
        isNonEmptyString(contextAction) &&
        isNonEmptyString(payloadAction) &&
        ACTIONS.has(contextAction) &&
        ACTIONS.has(payloadAction) &&
        contextAction !== payloadAction
    ) {

        addIssue(
            context,
            "CONTRACT_ACTION_MISMATCH",
            `/events/${eventIndex}/payload/action`,
            payloadAction,
            contextAction,
            `Event '${event.eventId}' context.action and payload.action disagree.`
        );
    }


    /*
     * NEXT_ACTION_SELECTED:
     *
     * context.action, if present, represents the
     * selected next action and must agree with
     * payload.nextAction.
     */
    if (
        event.eventType ===
        "NEXT_ACTION_SELECTED" &&
        isNonEmptyString(
            contextAction
        ) &&
        isNonEmptyString(
            event.payload?.nextAction
        ) &&
        contextAction !==
        event.payload.nextAction
    ) {

        addIssue(
            context,
            "CONTRACT_ACTION_MISMATCH",
            `/events/${eventIndex}/payload/nextAction`,
            event.payload.nextAction,
            contextAction,
            `NEXT_ACTION_SELECTED event '${event.eventId}' has inconsistent selected actions.`
        );
    }
}


/* =========================================================
 * Failure registry consistency
 * ========================================================= */


function validateFailureReferences(
    context
) {

    if (
        context.indexes
            .failureSignatures
            .size === 0
    ) {
        return;
    }


    /*
     * Questions
     */
    context.artifacts.questions
        .forEach(
            (question, questionIndex) => {

                if (
                    !isPlainObject(question) ||
                    !Array.isArray(
                        question.failureSignatures
                    )
                ) {
                    return;
                }


                question.failureSignatures
                    .forEach(
                        (signatureId, index) => {

                            if (
                                isNonEmptyString(
                                    signatureId
                                ) &&
                                !context.indexes
                                    .failureSignatures
                                    .has(signatureId)
                            ) {

                                addIssue(
                                    context,
                                    "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
                                    `/questions/${questionIndex}/failureSignatures/${index}`,
                                    signatureId,
                                    "canonical failure signature ID",
                                    `Question '${question.id}' references failure signature '${signatureId}' outside the canonical registry.`
                                );
                            }
                        }
                    );
            }
        );


    /*
     * Attempts
     */
    context.artifacts.attempts
        .forEach(
            (attempt, attemptIndex) => {

                if (!isPlainObject(attempt)) {
                    return;
                }


                const signatureId =
                    getAttemptFailureSignatureId(
                        attempt
                    );


                if (
                    isNonEmptyString(
                        signatureId
                    ) &&
                    !context.indexes
                        .failureSignatures
                        .has(signatureId)
                ) {

                    addIssue(
                        context,
                        "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
                        `/attempts/${attemptIndex}`,
                        signatureId,
                        "canonical failure signature ID",
                        `Attempt '${attempt.attemptId}' references failure signature '${signatureId}' outside the canonical registry.`
                    );
                }
            }
        );


    /*
     * Events
     */
    context.artifacts.events
        .forEach(
            (event, eventIndex) => {

                if (!isPlainObject(event)) {
                    return;
                }


                const signatureId =
                    event.payload
                        ?.failureSignatureId;


                if (
                    isNonEmptyString(
                        signatureId
                    ) &&
                    !context.indexes
                        .failureSignatures
                        .has(signatureId)
                ) {

                    addIssue(
                        context,
                        "CONTRACT_FAILURE_SIGNATURE_MISMATCH",
                        `/events/${eventIndex}/payload/failureSignatureId`,
                        signatureId,
                        "canonical failure signature ID",
                        `Event '${event.eventId}' references failure signature '${signatureId}' outside the canonical registry.`
                    );
                }
            }
        );
}


/* =========================================================
 * Student State ↔ Knowledge
 * ========================================================= */


function validateStudentStateReferences(
    context
) {

    const state =
        context.artifacts.studentState;


    if (
        !isPlainObject(state) ||
        context.indexes.nodes.size === 0
    ) {
        return;
    }


    /*
     * Current node.
     *
     * Different fixture versions may expose
     * currentNodeId at slightly different nested
     * locations. Compare only known fields.
     */
    const currentNodeCandidates = [

        {
            value:
                state.learning
                    ?.currentNodeId,

            path:
                "/studentState/learning/currentNodeId"
        },

        {
            value:
                state.adaptive
                    ?.currentNodeId,

            path:
                "/studentState/adaptive/currentNodeId"
        }
    ];


    for (
        const candidate
        of currentNodeCandidates
    ) {

        if (
            isNonEmptyString(
                candidate.value
            )
        ) {

            compareNodeExists(
                context,
                candidate.value,
                candidate.path
            );
        }
    }


    /*
     * Knowledge state keys.
     *
     * Support either:
     *
     * knowledge.nodes = { K001: {...} }
     *
     * or
     *
     * knowledge = { K001: {...} }
     *
     * without assuming production persistence.
     */
    const knowledgeNodes =
        state.knowledge?.nodes;


    if (isPlainObject(knowledgeNodes)) {

        for (
            const nodeId
            of Object.keys(
                knowledgeNodes
            )
        ) {

            compareNodeExists(
                context,
                nodeId,
                `/studentState/knowledge/nodes/${escapePointer(nodeId)}`
            );
        }
    }
}


/* =========================================================
 * Lesson ↔ Knowledge
 * ========================================================= */


function validateLessonReferences(
    context
) {

    if (
        context.indexes.nodes.size === 0
    ) {
        return;
    }


    context.artifacts.lessons
        .forEach(
            (lesson, lessonIndex) => {

                if (!isPlainObject(lesson)) {
                    return;
                }


                const arrays = [

                    {
                        value:
                            lesson.knowledgeNodes,

                        path:
                            `/lessons/${lessonIndex}/knowledgeNodes`
                    },

                    {
                        value:
                            lesson.primaryNodes,

                        path:
                            `/lessons/${lessonIndex}/primaryNodes`
                    },

                    {
                        value:
                            lesson.supportingNodes,

                        path:
                            `/lessons/${lessonIndex}/supportingNodes`
                    },

                    {
                        value:
                            lesson.prerequisites,

                        path:
                            `/lessons/${lessonIndex}/prerequisites`
                    }
                ];


                for (
                    const item
                    of arrays
                ) {

                    if (
                        !Array.isArray(
                            item.value
                        )
                    ) {
                        continue;
                    }


                    item.value.forEach(
                        (nodeId, index) => {

                            compareNodeExists(
                                context,
                                nodeId,
                                `${item.path}/${index}`
                            );
                        }
                    );
                }
            }
        );
}


/* =========================================================
 * Common comparison helpers
 * ========================================================= */


function compareNodeExists(
    context,
    nodeId,
    path
) {

    if (
        !isNonEmptyString(nodeId)
    ) {
        return;
    }


    if (
        !context.indexes.nodes.has(
            nodeId
        )
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            path,
            nodeId,
            "existing Knowledge Map node ID",
            `Node '${nodeId}' does not exist in the canonical Knowledge Map.`
        );
    }
}


/* =========================================================
 * Attempt compatibility helpers
 * ========================================================= */


function getAttemptFailureType(
    attempt
) {

    return firstDefinedString([
        attempt.failureType,
        attempt.diagnostic?.failureType,
        attempt.result?.failureType
    ]);
}


function getAttemptFailureSignatureId(
    attempt
) {

    return firstDefinedString([
        attempt.failureSignatureId,
        attempt.diagnostic
            ?.failureSignatureId,
        attempt.result
            ?.failureSignatureId
    ]);
}


function getAttemptSourceNodeId(
    attempt
) {

    return firstDefinedString([
        attempt.sourceNodeId,
        attempt.diagnostic
            ?.sourceNodeId,
        attempt.result
            ?.sourceNodeId
    ]);
}


/* =========================================================
 * Index helpers
 * ========================================================= */


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


    if (isPlainObject(value)) {

        /*
         * Single artifact.
         */
        if (
            isNonEmptyString(value.id) ||
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
         * Registry object.
         */
        return Object.values(value);
    }


    return [];
}


function buildIdMap(
    collection,
    idField
) {

    const result =
        new Map();


    for (
        const item
        of collection
    ) {

        if (
            isPlainObject(item) &&
            isNonEmptyString(
                item[idField]
            )
        ) {

            result.set(
                item[idField],
                item
            );
        }
    }


    return result;
}


function buildNodeIndex(
    knowledgeMap
) {

    const result =
        new Set();


    if (!isPlainObject(knowledgeMap)) {
        return result;
    }


    const nodes =
        Array.isArray(
            knowledgeMap.nodes
        )
            ? knowledgeMap.nodes
            : [];


    for (const node of nodes) {

        if (
            isPlainObject(node) &&
            isNonEmptyString(node.id)
        ) {

            result.add(node.id);
        }
    }


    return result;
}


function buildSkillIndex(
    knowledgeMap
) {

    const result =
        new Set();


    if (!isPlainObject(knowledgeMap)) {
        return result;
    }


    const collections = [
        knowledgeMap.skills,
        knowledgeMap.metaSkills
    ];


    for (
        const collection
        of collections
    ) {

        if (!Array.isArray(collection)) {
            continue;
        }


        for (const item of collection) {

            if (isNonEmptyString(item)) {

                result.add(item);

            } else if (
                isPlainObject(item) &&
                isNonEmptyString(item.id)
            ) {

                result.add(item.id);
            }
        }
    }


    const nodes =
        Array.isArray(
            knowledgeMap.nodes
        )
            ? knowledgeMap.nodes
            : [];


    for (const node of nodes) {

        if (
            !isPlainObject(node) ||
            !Array.isArray(node.skills)
        ) {
            continue;
        }


        for (
            const skillId
            of node.skills
        ) {

            if (
                isNonEmptyString(skillId)
            ) {

                result.add(skillId);
            }
        }
    }


    return result;
}


function buildFailureIndex(
    failureRegistry
) {

    const result =
        new Set();


    if (!failureRegistry) {
        return result;
    }


    let collection = null;


    if (Array.isArray(failureRegistry)) {

        collection =
            failureRegistry;

    } else if (
        Array.isArray(
            failureRegistry.signatures
        )
    ) {

        collection =
            failureRegistry.signatures;

    } else if (
        Array.isArray(
            failureRegistry
                .failureSignatures
        )
    ) {

        collection =
            failureRegistry
                .failureSignatures;
    }


    if (!collection) {
        return result;
    }


    for (const item of collection) {

        if (isNonEmptyString(item)) {

            result.add(item);

        } else if (
            isPlainObject(item) &&
            isNonEmptyString(item.id)
        ) {

            result.add(item.id);
        }
    }


    return result;
}


/* =========================================================
 * Report
 * ========================================================= */


function addIssue(
    context,
    code,
    path,
    value,
    expected,
    message
) {

    if (
        !CROSS_CONTRACT_CODES.has(code)
    ) {

        throw new Error(
            `CrossContractValidator attempted to emit non-cross-contract code '${code}'.`
        );
    }


    const metadata =
        getErrorMetadata(
            context,
            code
        );


    const issue = {

        code,

        severity:
            metadata.severity,

        category:
            metadata.category,

        path:
            path ?? null,

        message
    };


    if (value !== undefined) {
        issue.value = value;
    }


    if (expected !== undefined) {
        issue.expected = expected;
    }


    context.issues.push(issue);
}


function getErrorMetadata(
    context,
    code
) {

    const external =
        context.errorRegistry;


    if (external) {

        const candidate =
            external.codes?.[code] ??
            external[code];


        if (
            candidate &&
            typeof candidate.severity
            === "string" &&
            typeof candidate.category
            === "string"
        ) {

            return {
                severity:
                    candidate.severity,

                category:
                    candidate.category
            };
        }
    }


    const fallback =
        FALLBACK_ERROR_METADATA[code];


    if (fallback) {
        return fallback;
    }


    throw new Error(
        `CrossContractValidator attempted to emit unregistered error code '${code}'.`
    );
}


function buildReport(
    context,
    startedAt
) {

    const durationMs =
        Date.now() -
        startedAt;


    const errorCount =
        context.issues.filter(
            issue =>
                issue.severity ===
                "error"
        ).length;


    const warningCount =
        context.issues.filter(
            issue =>
                issue.severity ===
                "warning"
        ).length;


    const infoCount =
        context.issues.filter(
            issue =>
                issue.severity ===
                "info"
        ).length;


    return {

        schemaVersion:
            "1.0.0",

        validationId:
            createValidationId(),

        validator: {
            name:
                VALIDATOR_NAME,

            version:
                VALIDATOR_VERSION
        },

        target: {
            type:
                "cross-contract",

            id:
                null,

            path:
                context.options.path ??
                null
        },

        valid:
            errorCount === 0,

        summary: {
            errorCount,
            warningCount,
            infoCount
        },

        issues:
            context.issues,

        metadata: {
            validatedAt:
                new Date()
                    .toISOString(),

            durationMs,

            environment:
                context.options
                    .environment ??
                "test"
        }
    };
}


/* =========================================================
 * Utilities
 * ========================================================= */


function firstDefinedString(
    values
) {

    for (const value of values) {

        if (
            isNonEmptyString(value)
        ) {

            return value;
        }
    }


    return null;
}


function createValidationId() {

    return (
        "VAL-CROSS-" +
        Date.now()
            .toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()
    );
}


function isPlainObject(
    value
) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function isNonEmptyString(
    value
) {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}


function escapePointer(
    value
) {

    return String(value)
        .replace(
            /~/g,
            "~0"
        )
        .replace(
            /\//g,
            "~1"
        );
}