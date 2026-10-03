
/**
 * Knowledge Engine
 * =========================================================
 *
 * Responsibility:
 * - Read and query the Knowledge Map.
 * - Provide information about knowledge nodes.
 * - Resolve D1 / D2 / D3 dependencies.
 * - Resolve leadsTo relationships.
 * - Check prerequisite conditions against student state.
 *
 * This engine DOES NOT:
 * - calculate mastery
 * - evaluate answers
 * - select questions
 * - create remediation plans
 * - decide nextAction
 * - mutate student state
 *
 * Canonical Knowledge Node structure:
 *
 * {
 *   "id": "K014",
 *   "name": "ATP",
 *   "cluster": "C01",
 *   "priority": "P1",
 *   "targetMastery": "M4",
 *   "dependencies": {
 *     "D1": ["K005", "K006"],
 *     "D2": ["K007"],
 *     "D3": ["K041"]
 *   },
 *   "leadsTo": [
 *     "K035",
 *     "K040",
 *     "K041"
 *   ]
 * }
 *
 * =========================================================
 */


/* =========================================================
 * CONSTANTS
 * ========================================================= */

const DEPENDENCY_TYPES = Object.freeze([
    "D1",
    "D2",
    "D3"
]);

const MASTERY_LEVELS = Object.freeze([
    "M0",
    "M1",
    "M2",
    "M3",
    "M4"
]);

const PRIORITIES = Object.freeze([
    "P1",
    "P2"
]);


/* =========================================================
 * KNOWLEDGE ENGINE
 * ========================================================= */

class KnowledgeEngine {

    /**
     * @param {Object|Array} knowledgeMap
     */
    constructor(knowledgeMap) {

        if (!knowledgeMap) {
            throw new Error(
                "KnowledgeEngine: knowledgeMap is required."
            );
        }

        /*
         * Support both:
         *
         * knowledgeMap = {
         *   nodes: [...]
         * }
         *
         * and:
         *
         * knowledgeMap = [...]
         *
         * This keeps the engine flexible while the node
         * structure itself remains fixed.
         */
        this.nodes = this._extractNodes(knowledgeMap);

        this.nodeIndex = new Map();

        this._buildNodeIndex();

        this._validateReferences();
    }


    /* =======================================================
     * NODE ACCESS
     * ======================================================= */

    /**
     * Get one knowledge node.
     *
     * @param {string} nodeId
     * @returns {Object|null}
     */
    getNode(nodeId) {

        if (!this._isValidNodeId(nodeId)) {
            return null;
        }

        return this.nodeIndex.get(nodeId) || null;
    }


    /**
     * Check whether a node exists.
     *
     * @param {string} nodeId
     * @returns {boolean}
     */
    hasNode(nodeId) {

        return Boolean(
            this._isValidNodeId(nodeId) &&
            this.nodeIndex.has(nodeId)
        );
    }


    /**
     * Get all knowledge nodes.
     *
     * @returns {Object[]}
     */
    getAllNodes() {

        return Array.from(
            this.nodeIndex.values()
        );
    }


    /**
     * Get multiple nodes by IDs.
     *
     * @param {string[]} nodeIds
     * @returns {Object[]}
     */
    getNodes(nodeIds = []) {

        if (!Array.isArray(nodeIds)) {
            return [];
        }

        return nodeIds
            .map((nodeId) => this.getNode(nodeId))
            .filter(Boolean);
    }


    /* =======================================================
     * CLUSTER
     * ======================================================= */

    /**
     * Get all nodes in a cluster.
     *
     * @param {string} clusterId
     * @returns {Object[]}
     */
    getNodesByCluster(clusterId) {

        if (
            typeof clusterId !== "string" ||
            !clusterId.trim()
        ) {
            return [];
        }

        return this.getAllNodes().filter(
            (node) => node.cluster === clusterId
        );
    }


    /**
     * Get cluster IDs.
     *
     * @returns {string[]}
     */
    getClusterIds() {

        return [
            ...new Set(
                this.getAllNodes()
                    .map((node) => node.cluster)
                    .filter(Boolean)
            )
        ];
    }


    /* =======================================================
     * PRIORITY
     * ======================================================= */

    /**
     * Get nodes by priority.
     *
     * @param {"P1"|"P2"} priority
     * @returns {Object[]}
     */
    getNodesByPriority(priority) {

        if (!PRIORITIES.includes(priority)) {
            return [];
        }

        return this.getAllNodes().filter(
            (node) => node.priority === priority
        );
    }


    /* =======================================================
     * TARGET MASTERY
     * ======================================================= */

    /**
     * Get target mastery of a node.
     *
     * @param {string} nodeId
     * @returns {"M0"|"M1"|"M2"|"M3"|"M4"|null}
     */
    getTargetMastery(nodeId) {

        const node = this.getNode(nodeId);

        if (!node) {
            return null;
        }

        return node.targetMastery || null;
    }


    /**
     * Get nodes with a specific target mastery.
     *
     * @param {"M0"|"M1"|"M2"|"M3"|"M4"} mastery
     * @returns {Object[]}
     */
    getNodesByTargetMastery(mastery) {

        if (!MASTERY_LEVELS.includes(mastery)) {
            return [];
        }

        return this.getAllNodes().filter(
            (node) => node.targetMastery === mastery
        );
    }


    /* =======================================================
     * DEPENDENCIES
     * ======================================================= */

    /**
     * Get all dependencies of a node.
     *
     * Returns:
     *
     * {
     *   D1: [...],
     *   D2: [...],
     *   D3: [...]
     * }
     *
     * @param {string} nodeId
     * @returns {Object|null}
     */
    getDependencies(nodeId) {

        const node = this.getNode(nodeId);

        if (!node) {
            return null;
        }

        return {
            D1: [
                ...(node.dependencies?.D1 || [])
            ],

            D2: [
                ...(node.dependencies?.D2 || [])
            ],

            D3: [
                ...(node.dependencies?.D3 || [])
            ]
        };
    }


    /**
     * Get hard prerequisites.
     *
     * D1 = Hard prerequisite.
     *
     * @param {string} nodeId
     * @returns {Object[]}
     */
    getHardPrerequisites(nodeId) {

        const ids =
            this.getDependencies(nodeId)?.D1 || [];

        return this.getNodes(ids);
    }


    /**
     * Get supporting dependencies.
     *
     * D2 = Supporting dependency.
     *
     * @param {string} nodeId
     * @returns {Object[]}
     */
    getSupportingDependencies(nodeId) {

        const ids =
            this.getDependencies(nodeId)?.D2 || [];

        return this.getNodes(ids);
    }


    /**
     * Get transfer dependencies.
     *
     * D3 = Transfer dependency.
     *
     * @param {string} nodeId
     * @returns {Object[]}
     */
    getTransferDependencies(nodeId) {

        const ids =
            this.getDependencies(nodeId)?.D3 || [];

        return this.getNodes(ids);
    }


    /**
     * Get dependency type between two nodes.
     *
     * Example:
     *
     * getDependencyType("K005", "K014")
     * → "D1"
     *
     * @param {string} sourceNodeId
     * @param {string} targetNodeId
     * @returns {"D1"|"D2"|"D3"|null}
     */
    getDependencyType(
        sourceNodeId,
        targetNodeId
    ) {

        const targetNode =
            this.getNode(targetNodeId);

        if (!targetNode) {
            return null;
        }

        for (const type of DEPENDENCY_TYPES) {

            const dependencyIds =
                targetNode.dependencies?.[type] || [];

            if (
                dependencyIds.includes(sourceNodeId)
            ) {
                return type;
            }
        }

        return null;
    }


    /**
     * Check whether sourceNode is any type of
     * dependency of targetNode.
     *
     * @param {string} sourceNodeId
     * @param {string} targetNodeId
     * @returns {boolean}
     */
    isDependency(
        sourceNodeId,
        targetNodeId
    ) {

        return Boolean(
            this.getDependencyType(
                sourceNodeId,
                targetNodeId
            )
        );
    }


    /**
     * Check whether sourceNode is a D1 prerequisite.
     *
     * @param {string} sourceNodeId
     * @param {string} targetNodeId
     * @returns {boolean}
     */
    isHardPrerequisite(
        sourceNodeId,
        targetNodeId
    ) {

        return (
            this.getDependencyType(
                sourceNodeId,
                targetNodeId
            ) === "D1"
        );
    }


    /* =======================================================
     * LEADS TO
     * ======================================================= */

    /**
     * Get nodes that this node leads to.
     *
     * Example:
     *
     * getLeadsTo("K014")
     *
     * → K035, K040, K041...
     *
     * @param {string} nodeId
     * @returns {Object[]}
     */
    getLeadsTo(nodeId) {

        const node = this.getNode(nodeId);

        if (!node) {
            return [];
        }

        return this.getNodes(
            node.leadsTo || []
        );
    }


    /**
     * Get IDs of nodes that this node leads to.
     *
     * @param {string} nodeId
     * @returns {string[]}
     */
    getLeadNodeIds(nodeId) {

        const node = this.getNode(nodeId);

        if (!node) {
            return [];
        }

        return [
            ...(node.leadsTo || [])
        ];
    }


    /**
     * Check whether sourceNode leads to targetNode.
     *
     * @param {string} sourceNodeId
     * @param {string} targetNodeId
     * @returns {boolean}
     */
    leadsTo(
        sourceNodeId,
        targetNodeId
    ) {

        const node =
            this.getNode(sourceNodeId);

        if (!node) {
            return false;
        }

        return (
            Array.isArray(node.leadsTo) &&
            node.leadsTo.includes(targetNodeId)
        );
    }


    /* =======================================================
     * REVERSE RELATIONSHIPS
     * ======================================================= */

    /**
     * Find nodes that depend on a given node.
     *
     * Example:
     *
     * getDependents("K005")
     *
     * → all nodes whose D1/D2/D3 contains K005.
     *
     * @param {string} nodeId
     * @returns {Object[]}
     */
    getDependents(nodeId) {

        if (!this.hasNode(nodeId)) {
            return [];
        }

        const result = [];

        for (const node of this.getAllNodes()) {

            if (
                this.isDependency(
                    nodeId,
                    node.id
                )
            ) {
                result.push(node);
            }
        }

        return result;
    }


    /**
     * Find nodes that have this node in their leadsTo.
     *
     * @param {string} nodeId
     * @returns {Object[]}
     */
    getLeadsFrom(nodeId) {

        if (!this.hasNode(nodeId)) {
            return [];
        }

        return this.getAllNodes().filter(
            (node) =>
                Array.isArray(node.leadsTo) &&
                node.leadsTo.includes(nodeId)
        );
    }


    /* =======================================================
     * PREREQUISITE CHECK
     * ======================================================= */

    /**
     * Check D1 prerequisites against student knowledge state.
     *
     * IMPORTANT:
     * This method only REPORTS prerequisite status.
     *
     * It does NOT decide:
     *
     * "REMEDIATE"
     * "LEARN"
     * "SKIP"
     *
     * Adaptive Engine makes those decisions.
     *
     * @param {string} nodeId
     * @param {Object} studentKnowledge
     * @param {"M0"|"M1"|"M2"|"M3"|"M4"} minimumMastery
     * @returns {Object}
     */
    checkPrerequisites(
        nodeId,
        studentKnowledge = {},
        minimumMastery = "M2"
    ) {

        const node =
            this.getNode(nodeId);

        if (!node) {

            return {
                nodeId,
                valid: false,
                satisfied: false,
                missing: [],
                reason: "node_not_found"
            };
        }

        const d1 =
            node.dependencies?.D1 || [];

        const satisfied = [];
        const missing = [];

        for (const prerequisiteId of d1) {

            const state =
                studentKnowledge[prerequisiteId];

            const actualMastery =
                state?.mastery || "M0";

            const meetsRequirement =
                this.compareMastery(
                    actualMastery,
                    minimumMastery
                );

            const result = {
                nodeId: prerequisiteId,
                mastery: actualMastery,
                required: minimumMastery,
                satisfied: meetsRequirement
            };

            if (meetsRequirement) {
                satisfied.push(result);
            } else {
                missing.push(result);
            }
        }

        return {
            nodeId,
            valid: true,
            satisfied: missing.length === 0,
            satisfiedPrerequisites: satisfied,
            missing
        };
    }


    /**
     * Compare two mastery levels.
     *
     * @param {"M0"|"M1"|"M2"|"M3"|"M4"} actual
     * @param {"M0"|"M1"|"M2"|"M3"|"M4"} required
     * @returns {boolean}
     */
    compareMastery(
        actual,
        required
    ) {

        const actualIndex =
            MASTERY_LEVELS.indexOf(actual);

        const requiredIndex =
            MASTERY_LEVELS.indexOf(required);

        if (
            actualIndex === -1 ||
            requiredIndex === -1
        ) {
            return false;
        }

        return actualIndex >= requiredIndex;
    }


    /* =======================================================
     * PREREQUISITE CHAIN
     * ======================================================= */

    /**
     * Get recursive D1 prerequisite chain.
     *
     * Example:
     *
     * K206
     *  ↓
     * K202
     *  ↓
     * K200
     *
     * @param {string} nodeId
     * @param {number} maxDepth
     * @returns {Object[]}
     */
    getPrerequisiteChain(
        nodeId,
        maxDepth = 10
    ) {

        if (!this.hasNode(nodeId)) {
            return [];
        }

        const result = [];
        const visited = new Set();

        const walk = (
            currentNodeId,
            depth
        ) => {

            if (depth > maxDepth) {
                return;
            }

            if (visited.has(currentNodeId)) {
                return;
            }

            visited.add(currentNodeId);

            const prerequisites =
                this.getHardPrerequisites(
                    currentNodeId
                );

            for (const prerequisite of prerequisites) {

                result.push({
                    nodeId: prerequisite.id,
                    name: prerequisite.name,
                    depth
                });

                walk(
                    prerequisite.id,
                    depth + 1
                );
            }
        };

        walk(nodeId, 1);

        return result;
    }


    /* =======================================================
     * SEARCH
     * ======================================================= */

    /**
     * Simple structural text search.
     *
     * Searches:
     * - id
     * - name
     *
     * This is NOT semantic search.
     *
     * @param {string} keyword
     * @returns {Object[]}
     */
    searchNodes(keyword) {

        if (
            typeof keyword !== "string" ||
            !keyword.trim()
        ) {
            return [];
        }

        const query =
            keyword.trim().toLowerCase();

        return this.getAllNodes().filter(
            (node) => {

                const id =
                    String(node.id || "")
                        .toLowerCase();

                const name =
                    String(node.name || "")
                        .toLowerCase();

                return (
                    id.includes(query) ||
                    name.includes(query)
                );
            }
        );
    }


    /* =======================================================
     * MAP SUMMARY
     * ======================================================= */

    /**
     * Get structural summary.
     *
     * @returns {Object}
     */
    getSummary() {

        const nodes =
            this.getAllNodes();

        const clusterCounts = {};

        const priorityCounts = {};

        for (const node of nodes) {

            if (node.cluster) {
                clusterCounts[node.cluster] =
                    (clusterCounts[node.cluster] || 0) + 1;
            }

            if (node.priority) {
                priorityCounts[node.priority] =
                    (priorityCounts[node.priority] || 0) + 1;
            }
        }

        return {
            nodeCount: nodes.length,

            clusterCount:
                Object.keys(clusterCounts).length,

            clusterCounts,

            priorityCounts
        };
    }


    /* =======================================================
     * VALIDATION
     * ======================================================= */

    /**
     * Validate the structural integrity of the map.
     *
     * This is a structural validator only.
     *
     * @returns {Object}
     */
    validate() {

        const errors = [];
        const warnings = [];

        for (const node of this.getAllNodes()) {

            /* -----------------------------------------------
             * Required fields
             * --------------------------------------------- */

            if (!node.id) {
                errors.push({
                    nodeId: null,
                    code: "MISSING_ID",
                    message: "Node is missing id."
                });

                continue;
            }

            if (!node.name) {
                errors.push({
                    nodeId: node.id,
                    code: "MISSING_NAME",
                    message: "Node is missing name."
                });
            }

            if (!node.cluster) {
                warnings.push({
                    nodeId: node.id,
                    code: "MISSING_CLUSTER",
                    message: "Node has no cluster."
                });
            }

            if (
                node.priority &&
                !PRIORITIES.includes(node.priority)
            ) {
                errors.push({
                    nodeId: node.id,
                    code: "INVALID_PRIORITY",
                    message:
                        `Invalid priority: ${node.priority}`
                });
            }

            if (
                node.targetMastery &&
                !MASTERY_LEVELS.includes(
                    node.targetMastery
                )
            ) {
                errors.push({
                    nodeId: node.id,
                    code: "INVALID_TARGET_MASTERY",
                    message:
                        `Invalid targetMastery: ${node.targetMastery}`
                });
            }


            /* -----------------------------------------------
             * Dependencies
             * --------------------------------------------- */

            const dependencies =
                node.dependencies || {};

            for (const type of DEPENDENCY_TYPES) {

                const ids =
                    dependencies[type] || [];

                if (!Array.isArray(ids)) {

                    errors.push({
                        nodeId: node.id,
                        code: "INVALID_DEPENDENCY_LIST",
                        message:
                            `${type} must be an array.`
                    });

                    continue;
                }

                for (const dependencyId of ids) {

                    if (!this.hasNode(dependencyId)) {

                        errors.push({
                            nodeId: node.id,
                            code:
                                "UNKNOWN_DEPENDENCY_NODE",
                            message:
                                `${type} references unknown node ${dependencyId}.`
                        });
                    }

                    if (dependencyId === node.id) {

                        errors.push({
                            nodeId: node.id,
                            code:
                                "SELF_DEPENDENCY",
                            message:
                                `${type} cannot reference itself.`
                        });
                    }
                }
            }


            /* -----------------------------------------------
             * leadsTo
             * --------------------------------------------- */

            const leadsTo =
                node.leadsTo || [];

            if (!Array.isArray(leadsTo)) {

                errors.push({
                    nodeId: node.id,
                    code: "INVALID_LEADS_TO",
                    message:
                        "leadsTo must be an array."
                });

                continue;
            }

            for (const targetNodeId of leadsTo) {

                if (!this.hasNode(targetNodeId)) {

                    errors.push({
                        nodeId: node.id,
                        code:
                            "UNKNOWN_LEADS_TO_NODE",
                        message:
                            `leadsTo references unknown node ${targetNodeId}.`
                    });
                }

                if (targetNodeId === node.id) {

                    errors.push({
                        nodeId: node.id,
                        code:
                            "SELF_LEADS_TO",
                        message:
                            "Node cannot lead to itself."
                    });
                }
            }
        }


        /* -----------------------------------------------
         * Relationship consistency
         * --------------------------------------------- */

        for (const node of this.getAllNodes()) {

            const leadsTo =
                node.leadsTo || [];

            for (const targetNodeId of leadsTo) {

                const targetNode =
                    this.getNode(targetNodeId);

                if (!targetNode) {
                    continue;
                }

                const dependencyType =
                    this.getDependencyType(
                        node.id,
                        targetNodeId
                    );

                if (!dependencyType) {

                    warnings.push({
                        nodeId: node.id,
                        code:
                            "LEADS_TO_WITHOUT_DEPENDENCY",
                        message:
                            `${node.id}.leadsTo contains ${targetNodeId}, but ${targetNodeId} does not list ${node.id} as a dependency.`
                    });
                }
            }
        }


        return {
            valid: errors.length === 0,
            errors,
            warnings,
            summary: {
                errorCount: errors.length,
                warningCount: warnings.length
            }
        };
    }


    /* =======================================================
     * INTERNAL METHODS
     * ======================================================= */

    /**
     * Extract nodes from supported map formats.
     *
     * @param {Object|Array} knowledgeMap
     * @returns {Object[]}
     */
    _extractNodes(knowledgeMap) {

        if (Array.isArray(knowledgeMap)) {
            return knowledgeMap;
        }

        if (
            knowledgeMap &&
            Array.isArray(knowledgeMap.nodes)
        ) {
            return knowledgeMap.nodes;
        }

        /*
         * If your final knowledge-map-v4.json
         * is a direct object containing nodes by
         * ID, this can be extended later.
         */

        throw new Error(
            "KnowledgeEngine: knowledge map must contain a nodes array."
        );
    }


    /**
     * Build ID → node index.
     */
    _buildNodeIndex() {

        for (const node of this.nodes) {

            if (
                !node ||
                typeof node !== "object"
            ) {
                continue;
            }

            if (
                typeof node.id !== "string" ||
                !node.id.trim()
            ) {
                continue;
            }

            /*
             * Store a shallow frozen copy.
             *
             * Knowledge Engine should expose
             * read-only knowledge information.
             */
            this.nodeIndex.set(
                node.id,
                Object.freeze({
                    ...node
                })
            );
        }
    }


    /**
     * Validate references immediately after loading.
     *
     * Does not throw for normal reference problems;
     * validate() provides detailed diagnostics.
     */
    _validateReferences() {

        for (const node of this.getAllNodes()) {

            const dependencies =
                node.dependencies || {};

            for (const type of DEPENDENCY_TYPES) {

                const ids =
                    dependencies[type] || [];

                if (!Array.isArray(ids)) {
                    continue;
                }

                for (const dependencyId of ids) {

                    if (!this.hasNode(dependencyId)) {
                        console.warn(
                            `[KnowledgeEngine] ${node.id}.${type} references unknown node ${dependencyId}.`
                        );
                    }
                }
            }

            const leadsTo =
                node.leadsTo || [];

            if (!Array.isArray(leadsTo)) {
                continue;
            }

            for (const targetNodeId of leadsTo) {

                if (!this.hasNode(targetNodeId)) {
                    console.warn(
                        `[KnowledgeEngine] ${node.id}.leadsTo references unknown node ${targetNodeId}.`
                    );
                }
            }
        }
    }


    /**
     * Validate a node ID.
     *
     * @param {string} nodeId
     * @returns {boolean}
     */
    _isValidNodeId(nodeId) {

        return (
            typeof nodeId === "string" &&
            nodeId.trim().length > 0
        );
    }
}


/* =========================================================
 * FACTORY
 * ========================================================= */

/**
 * Create a Knowledge Engine instance.
 *
 * @param {Object|Array} knowledgeMap
 * @returns {KnowledgeEngine}
 */
export function createKnowledgeEngine(
    knowledgeMap
) {

    return new KnowledgeEngine(
        knowledgeMap
    );
}


/* =========================================================
 * DEFAULT EXPORT
 * ========================================================= */

export default KnowledgeEngine;

