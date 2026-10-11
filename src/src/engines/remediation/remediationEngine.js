/**
 * ============================================================
 * Remediation Engine V1.0.0
 * ============================================================
 *
 * Responsibility:
 *
 *   failure evidence
 *        ↓
 *   diagnose root cause
 *        ↓
 *   locate repair target
 *        ↓
 *   select remediation strategy
 *        ↓
 *   select remediation depth
 *        ↓
 *   build repair steps
 *        ↓
 *   build mini probe
 *        ↓
 *   define return condition
 *
 * DOES NOT:
 * - update mastery
 * - calculate mastery
 * - change evidence
 * - decide canonical next action
 * - select the final learning path
 * - mutate input objects
 *
 * Adaptive Engine decides WHAT happens next.
 * Remediation Engine decides HOW a diagnosed weakness is repaired.
 *
 * Output contract:
 *   remediation.schema.json
 *
 * Schema version:
 *   1.0.0
 * ============================================================
 */

const ENGINE_NAME = "RemediationEngine";
const ENGINE_VERSION = "1.0.0";
const SCHEMA_VERSION = "1.0.0";


/**
 * ============================================================
 * CANONICAL CONTRACT VALUES
 * ============================================================
 */

const CANONICAL_FAILURE_SIGNATURES = Object.freeze([
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


const ROOT_CAUSE_BY_FAILURE = Object.freeze({

    prerequisite_gap:
        "PREREQUISITE_GAP",

    concept_confusion:
        "CONCEPT_GAP",

    mechanism_confusion:
        "MECHANISM_GAP",

    calculation_error:
        "PROCEDURE_GAP",

    data_interpretation_error:
        "DATA_HANDLING_GAP",

    reasoning_error:
        "REASONING_GAP",

    cross_node_reasoning_error:
        "CROSS_NODE_GAP",

    /*
     * Important:
     *
     * careless_error does NOT imply a knowledge gap.
     *
     * The failure registry explicitly says careless error
     * may be an attention / operation error and does not
     * necessarily represent missing knowledge.
     */
    careless_error:
        "UNKNOWN",

    /*
     * source_knowledge_gap means the current failure appears
     * to originate from another source node.
     *
     * The current remediation schema has no
     * SOURCE_KNOWLEDGE_GAP rootCauseType.
     *
     * Do not falsely convert it to PREREQUISITE_GAP because
     * a source node is not necessarily a prerequisite.
     */
    source_knowledge_gap:
        "UNKNOWN",

    meta_skill_gap:
        "META_SKILL_GAP"
});


const STRATEGY_BY_FAILURE = Object.freeze({

    prerequisite_gap:
        "REBUILD_FOUNDATION",

    concept_confusion:
        "RETEACH_CONCEPT",

    mechanism_confusion:
        "EXPLAIN_MECHANISM",

    calculation_error:
        "PROCEDURE_REPAIR",

    data_interpretation_error:
        "DATA_INTERPRETATION",

    reasoning_error:
        "REASONING_REPAIR",

    cross_node_reasoning_error:
        "CROSS_NODE_REPAIR",

    careless_error:
        "MINIMAL_REPAIR",

    source_knowledge_gap:
        "REBUILD_FOUNDATION",

    meta_skill_gap:
        "META_SKILL_TRAINING"
});


const DEFAULT_QUESTION_TYPES = Object.freeze({

    REBUILD_FOUNDATION: [
        "mcq",
        "true_false",
        "matching",
        "fill_blank",
        "short_answer"
    ],

    RETEACH_CONCEPT: [
        "mcq",
        "true_false",
        "matching",
        "fill_blank",
        "short_answer"
    ],

    EXPLAIN_MECHANISM: [
        "mcq",
        "ordering",
        "short_answer",
        "sequence"
    ],

    GUIDED_PRACTICE: [
        "mcq",
        "multi_select",
        "fill_blank",
        "short_answer",
        "numeric"
    ],

    PROCEDURE_REPAIR: [
        "mcq",
        "short_answer",
        "numeric"
    ],

    DATA_INTERPRETATION: [
        "mcq",
        "multi_select",
        "numeric",
        "data_analysis"
    ],

    REASONING_REPAIR: [
        "mcq",
        "ordering",
        "short_answer",
        "data_analysis"
    ],

    CROSS_NODE_REPAIR: [
        "mcq",
        "multi_select",
        "ordering",
        "short_answer",
        "data_analysis"
    ],

    META_SKILL_TRAINING: [
        "mcq",
        "short_answer",
        "numeric",
        "data_analysis"
    ],

    MINIMAL_REPAIR: [
        "mcq",
        "true_false",
        "short_answer"
    ]
});


const STEP_TYPES_BY_STRATEGY = Object.freeze({

    REBUILD_FOUNDATION: [
        "MICRO_LEARN",
        "CONCEPT_CHECK",
        "MINI_PRACTICE"
    ],

    RETEACH_CONCEPT: [
        "MICRO_LEARN",
        "EXAMPLE",
        "CONCEPT_CHECK",
        "MINI_PRACTICE"
    ],

    EXPLAIN_MECHANISM: [
        "MICRO_LEARN",
        "EXAMPLE",
        "MECHANISM_CHECK",
        "MINI_PRACTICE"
    ],

    GUIDED_PRACTICE: [
        "EXAMPLE",
        "GUIDED_PRACTICE",
        "MINI_PRACTICE"
    ],

    PROCEDURE_REPAIR: [
        "ERROR_ANALYSIS",
        "GUIDED_PRACTICE",
        "MINI_PRACTICE"
    ],

    DATA_INTERPRETATION: [
        "ERROR_ANALYSIS",
        "DATA_INTERPRETATION",
        "MINI_PRACTICE"
    ],

    REASONING_REPAIR: [
        "ERROR_ANALYSIS",
        "REASONING_STEP",
        "MINI_PRACTICE"
    ],

    CROSS_NODE_REPAIR: [
        "ERROR_ANALYSIS",
        "CROSS_NODE_LINK",
        "MINI_PRACTICE"
    ],

    META_SKILL_TRAINING: [
        "ERROR_ANALYSIS",
        "META_SKILL_PRACTICE",
        "MINI_PRACTICE"
    ],

    MINIMAL_REPAIR: [
        "ERROR_ANALYSIS",
        "MINI_PRACTICE"
    ]
});


/**
 * ============================================================
 * PUBLIC API
 * ============================================================
 */

/**
 * Build a remediation plan.
 *
 * @param {Object} input
 *
 * @returns {Object}
 *
 * Output validates against remediation.schema.json V1.0.0
 */
export function buildRemediationPlan({

    studentId,

    adaptiveDecision = {},

    attempt = {},

    masteryState = {},

    knowledgeMap = {},

    failureSignatures = {},

    remediationRules = {},

    now = null

} = {}) {

    const timestamp =
        normalizeTimestamp(now);

    const originalNodeId =
        resolveOriginalNodeId({
            adaptiveDecision,
            attempt,
            masteryState
        });

    const failure =
        resolveFailure({
            adaptiveDecision,
            attempt,
            masteryState
        });

    const sourceNodeId =
        resolveSourceNodeId({
            failure,
            originalNodeId,
            adaptiveDecision,
            attempt,
            masteryState,
            knowledgeMap
        });

    const metaSkillId =
        resolveMetaSkillId({
            adaptiveDecision,
            attempt,
            masteryState
        });

    const supportingNodeIds =
        resolveSupportingNodeIds({
            originalNodeId,
            sourceNodeId,
            adaptiveDecision,
            attempt,
            knowledgeMap
        });

    const target =
        buildTarget({
            failure,
            originalNodeId,
            sourceNodeId,
            supportingNodeIds,
            metaSkillId
        });

    const diagnosis =
        buildDiagnosis({
            failure,
            originalNodeId,
            sourceNodeId,
            metaSkillId,
            adaptiveDecision,
            attempt,
            masteryState,
            knowledgeMap
        });

    const depth =
        selectDepth({
            failure,
            diagnosis,
            masteryState,
            adaptiveDecision,
            remediationRules
        });

    const strategy =
        selectStrategy({
            failure,
            remediationRules
        });

    const repairNodeIds =
        resolveRepairNodeIds({
            target,
            originalNodeId,
            sourceNodeId,
            supportingNodeIds
        });

    const plan =
        buildPlan({
            failure,
            strategy,
            depth,
            repairNodeIds,
            metaSkillId,
            remediationRules
        });

    const probe =
        buildProbe({
            failure,
            strategy,
            originalNodeId,
            sourceNodeId,
            repairNodeIds,
            depth,
            remediationRules
        });

    const returnPlan =
        buildReturnPlan({
            originalNodeId,
            failure
        });

    const constraints =
        buildConstraints({
            depth,
            remediationRules
        });

    const trigger =
        buildTrigger({
            failure,
            adaptiveDecision,
            attempt,
            masteryState
        });

    const remediationId =
        createRemediationId({
            studentId,
            originalNodeId,
            timestamp
        });

    const source =
        buildSource({
            adaptiveDecision,
            knowledgeMap,
            remediationRules
        });


    return {
        schemaVersion:
            SCHEMA_VERSION,

        remediationId,

        studentId:
            normalizeRequiredId(
                studentId,
                "unknown-student"
            ),

        timestamp,

        trigger,

        target,

        diagnosis,

        plan,

        probe,

        return:
            returnPlan,

        constraints,

        source
    };
}


/**
 * ============================================================
 * FAILURE RESOLUTION
 * ============================================================
 */

function resolveFailure({
    adaptiveDecision,
    attempt,
    masteryState
}) {

    const candidates = [

        attempt?.diagnostic
            ?.failureSignatureId,

        attempt?.diagnostic
            ?.failureType,

        attempt?.failureSignature,

        attempt?.failureSignatureId,

        adaptiveDecision?.reason
            ?.failureSignature,

        masteryState?.lastFailure
            ?.failureSignatureId,

        masteryState?.lastFailure
            ?.failureType,

        masteryState?.failure
            ?.failureSignatureId,

        masteryState?.failure
            ?.failureType

    ];


    for (const candidate of candidates) {

        if (
            CANONICAL_FAILURE_SIGNATURES
                .includes(candidate)
        ) {

            return {
                signature:
                    candidate,

                occurrenceCount:
                    resolveOccurrenceCount({
                        signature:
                            candidate,
                        adaptiveDecision,
                        attempt,
                        masteryState
                    })
            };
        }
    }


    /*
     * Conservative fallback.
     *
     * We must produce a canonical failure signature because
     * remediation.schema.json requires one.
     *
     * Do NOT invent a specific conceptual diagnosis.
     *
     * careless_error is the least aggressive canonical
     * fallback because it maps to UNKNOWN + MINIMAL_REPAIR.
     */
    return {
        signature:
            "careless_error",

        occurrenceCount:
            1,

        fallback:
            true
    };
}


function resolveOccurrenceCount({
    signature,
    adaptiveDecision,
    attempt,
    masteryState
}) {

    const directCandidates = [

        attempt?.diagnostic
            ?.occurrenceCount,

        attempt?.occurrenceCount,

        adaptiveDecision?.trigger
            ?.occurrenceCount,

        masteryState?.lastFailure
            ?.occurrenceCount,

        masteryState?.failure
            ?.occurrenceCount

    ];


    for (const value of directCandidates) {

        if (
            Number.isInteger(value) &&
            value >= 1
        ) {
            return value;
        }
    }


    const summary =
        masteryState?.failureSummary;

    if (
        summary &&
        typeof summary === "object"
    ) {

        const entry =
            summary[signature];

        if (
            Number.isInteger(entry) &&
            entry >= 1
        ) {
            return entry;
        }

        if (
            entry &&
            typeof entry === "object"
        ) {

            const count =
                entry.count ??
                entry.occurrenceCount;

            if (
                Number.isInteger(count) &&
                count >= 1
            ) {
                return count;
            }
        }
    }


    return 1;
}


/**
 * ============================================================
 * NODE RESOLUTION
 * ============================================================
 */

function resolveOriginalNodeId({
    adaptiveDecision,
    attempt,
    masteryState
}) {

    const candidates = [

        attempt?.primaryNode,

        attempt?.nodeId,

        adaptiveDecision?.target
            ?.primaryNodeId,

        adaptiveDecision?.target
            ?.nodeIds?.[0],

        masteryState?.nodeId

    ];


    return firstValidId(
        candidates,
        "unknown-node"
    );
}


function resolveSourceNodeId({
    failure,
    originalNodeId,
    adaptiveDecision,
    attempt,
    masteryState,
    knowledgeMap
}) {

    const explicitCandidates = [

        attempt?.diagnostic
            ?.sourceNodeId,

        attempt?.sourceNodeId,

        adaptiveDecision?.reason
            ?.sourceNodeId,

        adaptiveDecision?.target
            ?.sourceNodeId,

        masteryState?.lastFailure
            ?.sourceNodeId,

        masteryState?.failure
            ?.sourceNodeId

    ];


    const explicit =
        firstValidId(
            explicitCandidates,
            null
        );

    if (explicit) {
        return explicit;
    }


    /*
     * Only infer from dependency graph when the failure
     * explicitly represents a prerequisite gap.
     *
     * Do not infer prerequisite for careless_error,
     * concept_confusion, etc.
     */
    if (
        failure.signature ===
        "prerequisite_gap"
    ) {

        return findWeakestD1Prerequisite({
            nodeId:
                originalNodeId,

            masteryState,

            knowledgeMap
        });
    }


    /*
     * source_knowledge_gap requires an actual source node
     * from diagnostic evidence.
     *
     * If none exists, leave it undefined rather than
     * pretending the original node is its own source.
     */
    return undefined;
}


function resolveSupportingNodeIds({
    originalNodeId,
    sourceNodeId,
    adaptiveDecision,
    attempt,
    knowledgeMap
}) {

    const values = [];

    pushIds(
        values,
        adaptiveDecision
            ?.target
            ?.supportingNodeIds
    );

    pushIds(
        values,
        adaptiveDecision
            ?.selectionCriteria
            ?.secondaryNodes
    );

    pushIds(
        values,
        attempt?.secondaryNodes
    );


    const node =
        getKnowledgeNode(
            knowledgeMap,
            originalNodeId
        );

    const dependencies =
        extractDependencies(node);

    for (const dependency of dependencies) {

        if (
            dependency.type === "D2" ||
            dependency.type === "D3"
        ) {
            pushUnique(
                values,
                dependency.nodeId
            );
        }
    }


    return values.filter(
        (nodeId) =>
            nodeId !== originalNodeId &&
            nodeId !== sourceNodeId
    );
}


function resolveMetaSkillId({
    adaptiveDecision,
    attempt,
    masteryState
}) {

    const candidates = [

        adaptiveDecision?.reason
            ?.metaSkillId,

        adaptiveDecision
            ?.selectionCriteria
            ?.metaSkills?.[0],

        attempt?.metaSkillId,

        attempt?.skills?.[0],

        masteryState?.lastFailure
            ?.metaSkillId

    ];


    return firstValidId(
        candidates,
        null
    );
}


/**
 * ============================================================
 * TARGET
 * ============================================================
 */

function buildTarget({
    failure,
    originalNodeId,
    sourceNodeId,
    supportingNodeIds,
    metaSkillId
}) {

    let targetType =
        "ORIGINAL_NODE";


    if (
        failure.signature ===
        "meta_skill_gap" &&
        metaSkillId
    ) {

        targetType =
            "META_SKILL";
    }

    else if (
        sourceNodeId &&
        (
            failure.signature ===
            "prerequisite_gap" ||

            failure.signature ===
            "source_knowledge_gap"
        )
    ) {

        targetType =
            "SOURCE_NODE";
    }

    else if (
        failure.signature ===
        "cross_node_reasoning_error" &&
        supportingNodeIds.length > 0
    ) {

        targetType =
            "MULTI_NODE";
    }


    const target = {

        originalNodeId,

        targetType
    };


    if (sourceNodeId) {

        target.sourceNodeId =
            sourceNodeId;
    }


    if (
        supportingNodeIds.length > 0
    ) {

        target.supportingNodeIds =
            supportingNodeIds;
    }


    if (metaSkillId) {

        target.metaSkillId =
            metaSkillId;
    }


    return target;
}


/**
 * ============================================================
 * DIAGNOSIS
 * ============================================================
 */

function buildDiagnosis({
    failure,
    originalNodeId,
    sourceNodeId,
    metaSkillId,
    adaptiveDecision,
    attempt,
    masteryState,
    knowledgeMap
}) {

    const evidence =
        buildDiagnosticEvidence({
            failure,
            originalNodeId,
            sourceNodeId,
            metaSkillId,
            attempt,
            masteryState,
            knowledgeMap
        });


    const confidence =
        calculateDiagnosisConfidence({
            failure,
            sourceNodeId,
            metaSkillId,
            adaptiveDecision,
            attempt
        });


    return {

        failureSignature:
            failure.signature,

        confidence,

        evidence,

        rootCauseType:
            ROOT_CAUSE_BY_FAILURE[
            failure.signature
            ] ?? "UNKNOWN"
    };
}


function buildDiagnosticEvidence({
    failure,
    originalNodeId,
    sourceNodeId,
    metaSkillId,
    attempt,
    masteryState
}) {

    const evidence = [];


    const attemptId =
        firstValidId(
            [
                attempt?.attemptId,
                attempt?.id
            ],
            null
        );


    const questionId =
        firstValidId(
            [
                attempt?.questionId
            ],
            null
        );


    if (
        attemptId ||
        questionId
    ) {

        const item = {

            type:
                "FAILED_ATTEMPT",

            description:
                `Observed failure "${failure.signature}" on the recent attempt.`
        };


        if (attemptId) {
            item.attemptId =
                attemptId;
        }


        if (questionId) {
            item.questionId =
                questionId;
        }


        if (originalNodeId) {
            item.nodeId =
                originalNodeId;
        }


        evidence.push(item);
    }


    if (
        failure.occurrenceCount >= 2
    ) {

        const item = {

            type:
                "REPEATED_FAILURE",

            nodeId:
                originalNodeId,

            description:
                `Failure "${failure.signature}" has occurred ${failure.occurrenceCount} times.`
        };


        if (attemptId) {
            item.attemptId =
                attemptId;
        }


        if (questionId) {
            item.questionId =
                questionId;
        }


        evidence.push(item);
    }


    if (sourceNodeId) {

        evidence.push({

            type:
                "DEPENDENCY",

            nodeId:
                sourceNodeId,

            description:
                `Source/dependency node "${sourceNodeId}" is associated with the diagnosed weakness.`
        });
    }


    if (
        failure.signature ===
        "meta_skill_gap" &&
        metaSkillId
    ) {

        evidence.push({

            type:
                "META_SKILL_EVIDENCE",

            nodeId:
                originalNodeId,

            description:
                `Failure evidence points to meta skill "${metaSkillId}".`
        });
    }


    /*
     * Schema requires at least one diagnostic evidence item.
     *
     * If no attempt/dependency evidence is available, record
     * the existing mastery/failure state as the evidence
     * source rather than inventing a failed attempt.
     */
    if (evidence.length === 0) {

        evidence.push({

            type:
                "MASTERY_EVIDENCE",

            nodeId:
                originalNodeId,

            description:
                `Current learning state contains failure evidence "${failure.signature}".`
        });
    }


    return evidence;
}


function calculateDiagnosisConfidence({
    failure,
    sourceNodeId,
    metaSkillId,
    adaptiveDecision,
    attempt
}) {

    const explicitCandidates = [

        attempt?.diagnostic
            ?.confidence,

        adaptiveDecision?.diagnosis
            ?.confidence

    ];


    for (
        const value
        of explicitCandidates
    ) {

        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {

            return round(
                clamp(
                    value,
                    0,
                    1
                ),
                3
            );
        }
    }


    let confidence = 0.55;


    if (
        failure.occurrenceCount >= 2
    ) {
        confidence += 0.15;
    }


    if (
        failure.occurrenceCount >= 3
    ) {
        confidence += 0.10;
    }


    if (sourceNodeId) {
        confidence += 0.10;
    }


    if (
        failure.signature ===
        "meta_skill_gap" &&
        metaSkillId
    ) {
        confidence += 0.10;
    }


    if (failure.fallback) {

        /*
         * Fallback diagnosis must remain low-confidence.
         */
        confidence =
            Math.min(
                confidence,
                0.35
            );
    }


    return round(
        clamp(
            confidence,
            0,
            1
        ),
        3
    );
}


/**
 * ============================================================
 * STRATEGY
 * ============================================================
 */

function selectStrategy({
    failure,
    remediationRules
}) {

    const configured =
        remediationRules
            ?.strategyByFailure
        ?.[failure.signature];


    if (
        isAllowedStrategy(
            configured
        )
    ) {
        return configured;
    }


    return (
        STRATEGY_BY_FAILURE[
        failure.signature
        ] ??
        "MINIMAL_REPAIR"
    );
}


/**
 * ============================================================
 * DEPTH
 * ============================================================
 */

function selectDepth({
    failure,
    diagnosis,
    masteryState,
    adaptiveDecision,
    remediationRules
}) {

    const configuredMax =
        clampInteger(
            remediationRules
                ?.maximumDepth ??
            remediationRules
                ?.maxDepth ??
            adaptiveDecision
                ?.constraints
                ?.maxDepth ??
            3,

            1,
            3
        );


    let depth = 1;


    /*
     * One isolated error:
     * minimal repair.
     */
    if (
        failure.occurrenceCount >= 2
    ) {
        depth = 2;
    }


    /*
     * Persistent same failure:
     * deeper repair.
     */
    if (
        failure.occurrenceCount >= 3
    ) {
        depth = 3;
    }


    /*
     * Structural gaps justify at least depth 2.
     */
    if (
        [
            "prerequisite_gap",
            "source_knowledge_gap",
            "cross_node_reasoning_error"
        ].includes(
            failure.signature
        )
    ) {

        depth =
            Math.max(
                depth,
                2
            );
    }


    /*
     * careless_error must NOT automatically create
     * deep remediation.
     */
    if (
        failure.signature ===
        "careless_error"
    ) {

        depth = 1;
    }


    /*
     * Low diagnosis confidence should not cause aggressive
     * remediation.
     */
    if (
        diagnosis.confidence < 0.5
    ) {

        depth = 1;
    }


    return Math.min(
        depth,
        configuredMax
    );
}


/**
 * ============================================================
 * REPAIR NODE SELECTION
 * ============================================================
 */

function resolveRepairNodeIds({
    target,
    originalNodeId,
    sourceNodeId,
    supportingNodeIds
}) {

    switch (
    target.targetType
    ) {

        case "SOURCE_NODE":

            return uniqueIds([
                sourceNodeId ??
                originalNodeId
            ]);


        case "MULTI_NODE":

            return uniqueIds([
                originalNodeId,
                ...supportingNodeIds
            ]);


        case "SUPPORTING_NODE":

            return uniqueIds(
                supportingNodeIds.length > 0
                    ? supportingNodeIds
                    : [originalNodeId]
            );


        case "META_SKILL":

            /*
             * remediationStep.targetNodeIds is required by
             * current schema even for META_SKILL.
             *
             * Keep original knowledge node as learning context.
             */
            return [
                originalNodeId
            ];


        case "ORIGINAL_NODE":
        default:

            return [
                originalNodeId
            ];
    }
}


/**
 * ============================================================
 * PLAN
 * ============================================================
 */

function buildPlan({
    failure,
    strategy,
    depth,
    repairNodeIds,
    metaSkillId,
    remediationRules
}) {

    const allStepTypes =
        STEP_TYPES_BY_STRATEGY[
        strategy
        ] ??
        STEP_TYPES_BY_STRATEGY
            .MINIMAL_REPAIR;


    const selectedTypes =
        selectStepsForDepth({
            stepTypes:
                allStepTypes,

            depth
        });


    const questionTypes =
        resolveQuestionTypes({
            strategy,
            remediationRules
        });


    const difficulty =
        resolveDifficulty({
            strategy,
            depth
        });


    const steps =
        selectedTypes.map(
            (
                type,
                index
            ) => {

                const step = {

                    stepId:
                        `RSTEP-${index + 1}`,

                    type,

                    targetNodeIds:
                        [...repairNodeIds],

                    purpose:
                        describeStepPurpose({
                            type,
                            failure:
                                failure.signature
                        })
                };


                if (
                    metaSkillId &&
                    (
                        type ===
                        "META_SKILL_PRACTICE" ||

                        failure.signature ===
                        "meta_skill_gap"
                    )
                ) {

                    step.metaSkillIds = [
                        metaSkillId
                    ];
                }


                if (
                    stepSupportsQuestions(
                        type
                    )
                ) {

                    step.questionTypes =
                        [...questionTypes];

                    step.difficulty =
                        [...difficulty];
                }


                return step;
            }
        );


    return {

        strategy,

        steps,

        depth,

        estimatedMinutes:
            estimateMinutes({
                depth,
                stepCount:
                    steps.length
            })
    };
}


function selectStepsForDepth({
    stepTypes,
    depth
}) {

    if (
        stepTypes.length <= 2
    ) {
        return [...stepTypes];
    }


    if (depth === 1) {

        /*
         * Minimal:
         * diagnosis/repair + mini practice.
         */
        return uniqueStrings([
            stepTypes[0],
            stepTypes[
            stepTypes.length - 1
            ]
        ]);
    }


    if (depth === 2) {

        /*
         * Medium:
         * first repair step
         * + one guided/check step
         * + mini practice.
         */
        return uniqueStrings([
            stepTypes[0],
            stepTypes[1],
            stepTypes[
            stepTypes.length - 1
            ]
        ]);
    }


    /*
     * Depth 3:
     * use complete strategy path.
     */
    return [
        ...stepTypes
    ];
}


function describeStepPurpose({
    type,
    failure
}) {

    switch (type) {

        case "MICRO_LEARN":
            return (
                `Rebuild the minimum knowledge needed to repair "${failure}".`
            );

        case "EXAMPLE":
            return (
                "Show a worked example focused on the diagnosed weakness."
            );

        case "CONCEPT_CHECK":
            return (
                "Check whether the corrected concept is now distinguished correctly."
            );

        case "MECHANISM_CHECK":
            return (
                "Check whether the student can explain the mechanism correctly."
            );

        case "GUIDED_PRACTICE":
            return (
                "Practice the repaired procedure with guidance."
            );

        case "MINI_PRACTICE":
            return (
                "Apply the repaired knowledge independently on a small set of questions."
            );

        case "ERROR_ANALYSIS":
            return (
                `Identify why the previous response produced "${failure}".`
            );

        case "DATA_INTERPRETATION":
            return (
                "Practice reading and interpreting biological data correctly."
            );

        case "REASONING_STEP":
            return (
                "Reconstruct the reasoning chain step by step."
            );

        case "CROSS_NODE_LINK":
            return (
                "Rebuild the connection between the knowledge nodes required by the problem."
            );

        case "META_SKILL_PRACTICE":
            return (
                "Practice the meta skill responsible for the observed failure."
            );

        default:
            return (
                "Repair the diagnosed weakness."
            );
    }
}


/**
 * ============================================================
 * PROBE
 * ============================================================
 */

function buildProbe({
    failure,
    strategy,
    originalNodeId,
    sourceNodeId,
    repairNodeIds,
    depth,
    remediationRules
}) {

    const probeTarget =
        sourceNodeId ??
        repairNodeIds[0] ??
        originalNodeId;


    const questionTypes =
        resolveProbeQuestionTypes({
            strategy,
            remediationRules
        });


    const evidenceDimension =
        resolveProbeEvidenceDimension(
            failure.signature
        );


    return {

        required:
            true,

        type:
            "MINI_PROBE",

        targetNodeId:
            probeTarget,

        questionTypes,

        difficulty:
            resolveProbeDifficulty({
                failure:
                    failure.signature,
                depth
            }),

        successCriteria: {

            minimumResult:
                "correct",

            requiredEvidenceDimension:
                evidenceDimension
        }
    };
}


function resolveProbeEvidenceDimension(
    failureSignature
) {

    switch (
    failureSignature
    ) {

        case "prerequisite_gap":
        case "concept_confusion":
        case "source_knowledge_gap":
            return "know";


        case "mechanism_confusion":
            return "explain";


        case "calculation_error":
        case "data_interpretation_error":
        case "reasoning_error":
        case "careless_error":
        case "meta_skill_gap":
            return "apply";


        case "cross_node_reasoning_error":
            return "transfer";


        default:
            return "apply";
    }
}


function resolveProbeDifficulty({
    failure,
    depth
}) {

    if (
        failure ===
        "cross_node_reasoning_error"
    ) {

        return depth >= 2
            ? "D3"
            : "D2";
    }


    if (
        [
            "reasoning_error",
            "data_interpretation_error"
        ].includes(failure)
    ) {

        return "D2";
    }


    return "D1";
}


/**
 * ============================================================
 * RETURN PLAN
 * ============================================================
 */

function buildReturnPlan({
    originalNodeId
}) {

    /*
     * Do NOT set return.action.
     *
     * remediation.schema.json allows it, but choosing
     * PRACTICE / CHALLENGE / RETEST / REVIEW is an
     * Adaptive Engine responsibility.
     */

    return {

        targetNodeId:
            originalNodeId,

        condition:
            "PROBE_PASSED",

        preserveOriginalFailure:
            true
    };
}


/**
 * ============================================================
 * TRIGGER
 * ============================================================
 */

function buildTrigger({
    failure,
    adaptiveDecision,
    attempt,
    masteryState
}) {

    const trigger = {

        type:
            resolveTriggerType({
                failure,
                adaptiveDecision,
                masteryState
            }),

        failureSignature:
            failure.signature,

        occurrenceCount:
            failure.occurrenceCount,

        repeated:
            failure.occurrenceCount >= 2
    };


    const attemptId =
        firstValidId(
            [
                attempt?.attemptId,
                attempt?.id
            ],
            null
        );


    if (attemptId) {
        trigger.attemptId =
            attemptId;
    }


    const questionId =
        firstValidId(
            [
                attempt?.questionId
            ],
            null
        );


    if (questionId) {
        trigger.questionId =
            questionId;
    }


    const masteryUpdateId =
        firstValidId(
            [
                adaptiveDecision?.source
                    ?.masteryUpdateId,

                masteryState
                    ?.masteryUpdateId
            ],
            null
        );


    if (masteryUpdateId) {
        trigger.masteryUpdateId =
            masteryUpdateId;
    }


    return trigger;
}


function resolveTriggerType({
    failure,
    adaptiveDecision
}) {

    if (
        adaptiveDecision?.triggerType &&
        isAllowedTriggerType(
            adaptiveDecision
                .triggerType
        )
    ) {

        return adaptiveDecision
            .triggerType;
    }


    if (
        failure.occurrenceCount >= 2
    ) {

        return "REPEATED_FAILURE";
    }


    switch (
    failure.signature
    ) {

        case "prerequisite_gap":
            return "PREREQUISITE_GAP";


        case "source_knowledge_gap":
            return "SOURCE_KNOWLEDGE_GAP";


        case "meta_skill_gap":
            return "META_SKILL_GAP";


        case "cross_node_reasoning_error":
            return "TRANSFER_FAILURE";


        default:
            return "ATTEMPT_FAILURE";
    }
}


/**
 * ============================================================
 * CONSTRAINTS
 * ============================================================
 */

function buildConstraints({
    depth,
    remediationRules
}) {

    return {

        maxDepth:
            clampInteger(
                remediationRules
                    ?.maximumDepth ??
                remediationRules
                    ?.maxDepth ??
                3,

                1,
                3
            ),

        maxMinutes:
            clampInteger(
                remediationRules
                    ?.maxMinutes ??
                (
                    depth === 1
                        ? 10
                        : depth === 2
                            ? 20
                            : 30
                ),

                1,
                90
            ),

        maxQuestions:
            clampInteger(
                remediationRules
                    ?.maxQuestions ??
                (
                    depth === 1
                        ? 3
                        : depth === 2
                            ? 5
                            : 7
                ),

                1,
                20
            ),

        avoidExactQuestion:
            remediationRules
                ?.avoidExactQuestion !==
            false,

        avoidSameContext:
            remediationRules
                ?.avoidSameContext !==
            false,

        respectPrerequisites:
            remediationRules
                ?.respectPrerequisites !==
            false,

        allowEscalation:
            remediationRules
                ?.allowEscalation !==
            false
    };
}


/**
 * ============================================================
 * SOURCE
 * ============================================================
 */

function buildSource({
    adaptiveDecision,
    knowledgeMap,
    remediationRules
}) {

    const source = {

        engine:
            ENGINE_NAME,

        rulesVersion:
            String(
                remediationRules
                    ?.schemaVersion ??
                remediationRules
                    ?.version ??
                remediationRules
                    ?.rulesVersion ??
                ENGINE_VERSION
            )
    };


    const knowledgeMapVersion =
        knowledgeMap?.schemaVersion ??
        knowledgeMap?.version;


    if (
        typeof knowledgeMapVersion ===
        "string" &&
        knowledgeMapVersion.length > 0
    ) {

        source.knowledgeMapVersion =
            knowledgeMapVersion;
    }


    const masteryUpdateId =
        adaptiveDecision
            ?.source
            ?.masteryUpdateId;


    if (
        typeof masteryUpdateId ===
        "string" &&
        masteryUpdateId.length > 0
    ) {

        source.masteryUpdateId =
            masteryUpdateId;
    }


    return source;
}


/**
 * ============================================================
 * QUESTION SELECTION
 * ============================================================
 */

function resolveQuestionTypes({
    strategy,
    remediationRules
}) {

    const configured =
        remediationRules
            ?.questionTypesByStrategy
        ?.[strategy];


    const values =
        Array.isArray(configured)
            ? configured
            : DEFAULT_QUESTION_TYPES[
            strategy
            ];


    return uniqueStrings(
        values.filter(
            isAllowedQuestionType
        )
    );
}


function resolveProbeQuestionTypes({
    strategy,
    remediationRules
}) {

    const configured =
        remediationRules
            ?.probeQuestionTypesByStrategy
        ?.[strategy];


    if (
        Array.isArray(configured)
    ) {

        const valid =
            uniqueStrings(
                configured.filter(
                    isAllowedQuestionType
                )
            );

        if (valid.length > 0) {
            return valid;
        }
    }


    const strategyTypes =
        resolveQuestionTypes({
            strategy,
            remediationRules
        });


    /*
     * Keep probe focused.
     */
    return strategyTypes.slice(
        0,
        Math.min(
            4,
            strategyTypes.length
        )
    );
}


function resolveDifficulty({
    strategy,
    depth
}) {

    if (
        strategy ===
        "CROSS_NODE_REPAIR"
    ) {

        return depth >= 2
            ? ["D2", "D3"]
            : ["D2"];
    }


    if (
        [
            "REASONING_REPAIR",
            "DATA_INTERPRETATION"
        ].includes(strategy)
    ) {

        return depth >= 2
            ? ["D1", "D2", "D3"]
            : ["D1", "D2"];
    }


    if (depth === 3) {
        return [
            "D1",
            "D2",
            "D3"
        ];
    }


    if (depth === 2) {
        return [
            "D1",
            "D2"
        ];
    }


    return [
        "D1"
    ];
}


/**
 * ============================================================
 * KNOWLEDGE MAP HELPERS
 * ============================================================
 */

function findWeakestD1Prerequisite({
    nodeId,
    masteryState,
    knowledgeMap
}) {

    const node =
        getKnowledgeNode(
            knowledgeMap,
            nodeId
        );


    const dependencies =
        extractDependencies(node)
            .filter(
                (dependency) =>
                    dependency.type ===
                    "D1"
            );


    if (
        dependencies.length === 0
    ) {

        return undefined;
    }


    const ranked =
        dependencies
            .map(
                (dependency) => ({
                    nodeId:
                        dependency.nodeId,

                    mastery:
                        getNodeMastery(
                            masteryState,
                            dependency.nodeId
                        )
                })
            )
            .sort(
                (a, b) =>
                    masteryRank(
                        a.mastery
                    ) -
                    masteryRank(
                        b.mastery
                    )
            );


    return ranked[0]?.nodeId;
}


function getKnowledgeNode(
    knowledgeMap,
    nodeId
) {

    if (
        !knowledgeMap ||
        typeof knowledgeMap !== "object"
    ) {
        return null;
    }


    if (
        knowledgeMap.nodes &&
        !Array.isArray(
            knowledgeMap.nodes
        ) &&
        knowledgeMap.nodes[nodeId]
    ) {

        return knowledgeMap
            .nodes[nodeId];
    }


    if (
        Array.isArray(
            knowledgeMap.nodes
        )
    ) {

        return (
            knowledgeMap.nodes.find(
                (node) =>
                    node?.id ===
                    nodeId
            ) ??
            null
        );
    }


    if (
        knowledgeMap[nodeId]
    ) {
        return knowledgeMap[nodeId];
    }


    return null;
}


function extractDependencies(node) {

    if (
        !node ||
        typeof node !== "object"
    ) {
        return [];
    }


    const raw =
        node.dependencies ??
        node.prerequisites ??
        node.requires ??
        [];


    const result = [];


    if (Array.isArray(raw)) {

        for (const item of raw) {

            const normalized =
                normalizeDependency(
                    item
                );

            if (normalized) {
                result.push(
                    normalized
                );
            }
        }

        return result;
    }


    if (
        raw &&
        typeof raw === "object"
    ) {

        for (
            const [
                type,
                values
            ]
            of Object.entries(raw)
        ) {

            if (
                !Array.isArray(values)
            ) {
                continue;
            }


            for (const value of values) {

                const nodeId =
                    typeof value ===
                        "string"
                        ? value
                        : (
                            value?.nodeId ??
                            value?.id
                        );


                if (
                    typeof nodeId ===
                    "string" &&
                    nodeId.length > 0
                ) {

                    result.push({
                        nodeId,
                        type:
                            normalizeDependencyType(
                                type
                            )
                    });
                }
            }
        }
    }


    return result;
}


function normalizeDependency(item) {

    if (
        typeof item ===
        "string"
    ) {

        return {
            nodeId:
                item,

            type:
                "D1"
        };
    }


    if (
        !item ||
        typeof item !== "object"
    ) {
        return null;
    }


    const nodeId =
        item.nodeId ??
        item.id ??
        item.targetNodeId;


    if (
        typeof nodeId !== "string" ||
        nodeId.length === 0
    ) {
        return null;
    }


    return {

        nodeId,

        type:
            normalizeDependencyType(
                item.type ??
                item.dependencyType ??
                item.level
            )
    };
}


function normalizeDependencyType(
    value
) {

    if (
        [
            "D1",
            "D2",
            "D3"
        ].includes(value)
    ) {
        return value;
    }


    return "D1";
}


/**
 * ============================================================
 * MASTERY HELPERS
 * ============================================================
 */

function getNodeMastery(
    masteryState,
    nodeId
) {

    if (
        !masteryState ||
        typeof masteryState !==
        "object"
    ) {
        return "M0";
    }


    const direct =
        masteryState[nodeId];


    if (
        direct &&
        typeof direct === "object"
    ) {

        return normalizeMastery(
            direct.mastery
        );
    }


    const knowledge =
        masteryState.knowledge
        ?.[nodeId];


    if (
        knowledge &&
        typeof knowledge ===
        "object"
    ) {

        return normalizeMastery(
            knowledge.mastery
        );
    }


    if (
        masteryState.nodeId ===
        nodeId
    ) {

        return normalizeMastery(
            masteryState.mastery
        );
    }


    return "M0";
}


function normalizeMastery(
    value
) {

    if (
        [
            "M0",
            "M1",
            "M2",
            "M3",
            "M4"
        ].includes(value)
    ) {

        return value;
    }


    return "M0";
}


function masteryRank(
    mastery
) {

    return {
        M0: 0,
        M1: 1,
        M2: 2,
        M3: 3,
        M4: 4
    }[
        normalizeMastery(
            mastery
        )
    ];
}


/**
 * ============================================================
 * VALIDATION HELPERS
 * ============================================================
 */

function isAllowedQuestionType(
    value
) {

    return [
        "mcq",
        "multi_select",
        "true_false",
        "matching",
        "ordering",
        "fill_blank",
        "short_answer",
        "numeric",
        "data_analysis",
        "experiment",
        "sequence",
        "open_response"
    ].includes(value);
}


function isAllowedStrategy(
    value
) {

    return [
        "REBUILD_FOUNDATION",
        "RETEACH_CONCEPT",
        "EXPLAIN_MECHANISM",
        "GUIDED_PRACTICE",
        "PROCEDURE_REPAIR",
        "DATA_INTERPRETATION",
        "REASONING_REPAIR",
        "CROSS_NODE_REPAIR",
        "META_SKILL_TRAINING",
        "MINIMAL_REPAIR"
    ].includes(value);
}


function isAllowedTriggerType(
    value
) {

    return [
        "ATTEMPT_FAILURE",
        "REPEATED_FAILURE",
        "PREREQUISITE_GAP",
        "SOURCE_KNOWLEDGE_GAP",
        "META_SKILL_GAP",
        "TRANSFER_FAILURE",
        "RETEST_FAILURE",
        "ADAPTIVE_ESCALATION"
    ].includes(value);
}


function stepSupportsQuestions(
    type
) {

    return [
        "CONCEPT_CHECK",
        "MECHANISM_CHECK",
        "GUIDED_PRACTICE",
        "MINI_PRACTICE",
        "DATA_INTERPRETATION",
        "REASONING_STEP",
        "CROSS_NODE_LINK",
        "META_SKILL_PRACTICE"
    ].includes(type);
}


/**
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function estimateMinutes({
    depth,
    stepCount
}) {

    const estimate =
        (
            depth * 5
        ) +
        (
            stepCount * 2
        );


    return clampInteger(
        estimate,
        1,
        180
    );
}


function normalizeTimestamp(
    now
) {

    if (
        typeof now === "string"
    ) {

        const date =
            new Date(now);

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date
                .toISOString();
        }
    }


    if (
        now instanceof Date &&
        !Number.isNaN(
            now.getTime()
        )
    ) {

        return now
            .toISOString();
    }


    return new Date()
        .toISOString();
}


function createRemediationId({
    studentId,
    originalNodeId,
    timestamp
}) {

    const safeStudent =
        sanitizeIdPart(
            studentId ??
            "unknown-student"
        );


    const safeNode =
        sanitizeIdPart(
            originalNodeId ??
            "unknown-node"
        );


    const safeTime =
        timestamp
            .replace(
                /[^0-9]/g,
                ""
            );


    return (
        `REM-${safeStudent}-${safeNode}-${safeTime}`
    );
}


function sanitizeIdPart(
    value
) {

    return String(value)
        .replace(
            /[^A-Za-z0-9_-]/g,
            "-"
        );
}


function normalizeRequiredId(
    value,
    fallback
) {

    if (
        typeof value === "string" &&
        value.length > 0
    ) {
        return value;
    }


    return fallback;
}


function firstValidId(
    candidates,
    fallback
) {

    for (
        const candidate
        of candidates
    ) {

        if (
            typeof candidate ===
            "string" &&
            candidate.length > 0
        ) {

            return candidate;
        }
    }


    return fallback;
}


function pushIds(
    target,
    values
) {

    if (
        !Array.isArray(values)
    ) {
        return;
    }


    for (const value of values) {
        pushUnique(
            target,
            value
        );
    }
}


function pushUnique(
    target,
    value
) {

    if (
        typeof value !== "string" ||
        value.length === 0
    ) {
        return;
    }


    if (
        !target.includes(value)
    ) {

        target.push(value);
    }
}


function uniqueIds(
    values
) {

    return uniqueStrings(
        values.filter(
            (value) =>
                typeof value ===
                "string" &&
                value.length > 0
        )
    );
}


function uniqueStrings(
    values
) {

    return [
        ...new Set(values)
    ];
}


function clamp(
    value,
    min,
    max
) {

    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}


function clampInteger(
    value,
    min,
    max
) {

    const numeric =
        Number(value);


    if (
        !Number.isFinite(numeric)
    ) {

        return min;
    }


    return Math.trunc(
        clamp(
            numeric,
            min,
            max
        )
    );
}


function round(
    value,
    decimals
) {

    const factor =
        10 ** decimals;


    return (
        Math.round(
            value * factor
        ) /
        factor
    );
}