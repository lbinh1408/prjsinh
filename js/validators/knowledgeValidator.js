/**
 * knowledgeValidator.js
 *
 * PHASE 1 — DATA VALIDATION LAYER
 *
 * Responsibility:
 *   READ -> CHECK -> REPORT
 *
 * This validator:
 *   - validates Knowledge Map structure
 *   - validates node references
 *   - validates dependency graph
 *   - reports validation issues
 *
 * This validator MUST NOT:
 *   - modify Knowledge Map
 *   - repair invalid data
 *   - calculate mastery
 *   - decide learning paths
 *   - perform engine business logic
 */

const VALIDATOR_NAME = "knowledge-validator";
const VALIDATOR_VERSION = "1.0.0";

const VALID_NODE_ID_PATTERNS = {
    knowledge: /^K\d{3}$/,
    metaSkill: /^S\d{3}$/
};

const ALLOWED_DEPENDENCY_TYPES = new Set([
    "D1",
    "D2",
    "D3"
]);

const ALLOWED_PRIORITIES = new Set([
    "P1",
    "P2"
]);

const ALLOWED_TARGET_MASTERY = new Set([
    "M2",
    "M3",
    "M4"
]);

/**
 * Error-code metadata.
 *
 * Canonical definitions still belong to:
 * validation/error-codes.json
 *
 * These values are only fallback metadata so the validator
 * can produce a complete report when used standalone.
 */
const ERROR_METADATA = {
    KNOWLEDGE_DUPLICATE_NODE_ID: {
        severity: "error",
        category: "consistency"
    },

    KNOWLEDGE_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    KNOWLEDGE_DEPENDENCY_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    KNOWLEDGE_SELF_DEPENDENCY: {
        severity: "error",
        category: "graph"
    },

    KNOWLEDGE_CYCLE_DETECTED: {
        severity: "error",
        category: "graph"
    },

    KNOWLEDGE_LEADS_TO_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    KNOWLEDGE_CLUSTER_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    KNOWLEDGE_SKILL_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    KNOWLEDGE_INVALID_PRIORITY: {
        severity: "error",
        category: "contract"
    },

    KNOWLEDGE_INVALID_TARGET_MASTERY: {
        severity: "error",
        category: "contract"
    },

    INVALID_FORMAT: {
        severity: "error",
        category: "schema"
    },

    INVALID_FIELD_TYPE: {
        severity: "error",
        category: "schema"
    },

    REQUIRED_FIELD_MISSING: {
        severity: "error",
        category: "schema"
    },

    INVALID_ENUM_VALUE: {
        severity: "error",
        category: "schema"
    }
};


/* =========================================================
 * PUBLIC API
 * ======================================================= */

/**
 * Validate a complete Knowledge Map.
 *
 * @param {Object} knowledgeMap
 * @param {Object} [options]
 * @param {Object|null} [options.errorRegistry]
 * @param {string|null} [options.path]
 *
 * @returns {Object} validation report
 */
export function validateKnowledgeMap(
    knowledgeMap,
    options = {}
) {
    const startedAt = Date.now();

    const context = createValidationContext(
        knowledgeMap,
        options
    );

    validateRootStructure(context);

    /*
     * Later checks require nodes/clusters.
     * Do not crash if root structure is already invalid.
     */
    if (Array.isArray(knowledgeMap?.nodes)) {
        buildIndexes(context);

        validateNodes(context);
        validateReferences(context);
        validateDependencyGraph(context);
    }

    return buildValidationReport(
        context,
        Date.now() - startedAt
    );
}


/* =========================================================
 * CONTEXT
 * ======================================================= */

function createValidationContext(
    knowledgeMap,
    options
) {
    return {
        knowledgeMap,

        errorRegistry:
            options.errorRegistry ?? null,

        targetPath:
            options.path ?? null,

        issues: [],

        indexes: {
            nodesById: new Map(),
            duplicateNodeIds: new Set(),
            clusterIds: new Set()
        }
    };
}


/* =========================================================
 * ROOT STRUCTURE
 * ======================================================= */

function validateRootStructure(context) {
    const map = context.knowledgeMap;

    if (!isPlainObject(map)) {
        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/",
            map,
            "object",
            "Knowledge Map must be an object."
        );

        return;
    }

    validateRequiredField(
        context,
        map,
        "schemaVersion",
        "/schemaVersion"
    );

    validateRequiredField(
        context,
        map,
        "mapVersion",
        "/mapVersion"
    );

    validateRequiredField(
        context,
        map,
        "clusters",
        "/clusters"
    );

    validateRequiredField(
        context,
        map,
        "nodes",
        "/nodes"
    );

    if (
        "clusters" in map &&
        !Array.isArray(map.clusters)
    ) {
        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/clusters",
            map.clusters,
            "array",
            "Knowledge Map clusters must be an array."
        );
    }

    if (
        "nodes" in map &&
        !Array.isArray(map.nodes)
    ) {
        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/nodes",
            map.nodes,
            "array",
            "Knowledge Map nodes must be an array."
        );
    }
}


/* =========================================================
 * INDEXES
 * ======================================================= */

function buildIndexes(context) {
    const map = context.knowledgeMap;

    /*
     * Cluster index
     */
    if (Array.isArray(map.clusters)) {
        for (const cluster of map.clusters) {
            const clusterId = getClusterId(cluster);

            if (clusterId) {
                context.indexes.clusterIds.add(
                    clusterId
                );
            }
        }
    }

    /*
     * Node index
     */
    for (
        let index = 0;
        index < map.nodes.length;
        index++
    ) {
        const node = map.nodes[index];

        if (!isPlainObject(node)) {
            continue;
        }

        if (
            typeof node.id !== "string" ||
            node.id.length === 0
        ) {
            continue;
        }

        if (
            context.indexes.nodesById.has(node.id)
        ) {
            context.indexes
                .duplicateNodeIds
                .add(node.id);

            continue;
        }

        context.indexes.nodesById.set(
            node.id,
            node
        );
    }
}


/* =========================================================
 * NODE VALIDATION
 * ======================================================= */

function validateNodes(context) {
    const nodes = context.knowledgeMap.nodes;

    const reportedDuplicateIds = new Set();

    for (
        let index = 0;
        index < nodes.length;
        index++
    ) {
        const node = nodes[index];

        const basePath =
            `/nodes/${index}`;

        if (!isPlainObject(node)) {
            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                basePath,
                node,
                "object",
                `Knowledge node at index ${index} must be an object.`
            );

            continue;
        }

        validateNodeRequiredFields(
            context,
            node,
            basePath
        );

        validateNodeId(
            context,
            node,
            basePath
        );

        validateDuplicateNodeId(
            context,
            node,
            basePath,
            reportedDuplicateIds
        );

        validateNodeCluster(
            context,
            node,
            basePath
        );

        validateNodePriority(
            context,
            node,
            basePath
        );

        validateNodeTargetMastery(
            context,
            node,
            basePath
        );

        validateNodeDependencies(
            context,
            node,
            basePath
        );

        validateNodeLeadsTo(
            context,
            node,
            basePath
        );
    }
}


function validateNodeRequiredFields(
    context,
    node,
    basePath
) {
    const requiredFields = [
        "id",
        "name",
        "cluster",
        "priority",
        "targetMastery",
        "dependencies",
        "leadsTo"
    ];

    for (const field of requiredFields) {
        validateRequiredField(
            context,
            node,
            field,
            `${basePath}/${field}`
        );
    }
}


function validateNodeId(
    context,
    node,
    basePath
) {
    if (!("id" in node)) {
        return;
    }

    if (typeof node.id !== "string") {
        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${basePath}/id`,
            node.id,
            "string",
            "Knowledge node id must be a string."
        );

        return;
    }

    const valid =
        VALID_NODE_ID_PATTERNS.knowledge.test(
            node.id
        ) ||
        VALID_NODE_ID_PATTERNS.metaSkill.test(
            node.id
        );

    if (!valid) {
        addIssue(
            context,
            "INVALID_FORMAT",
            `${basePath}/id`,
            node.id,
            "Kxxx or Sxxx",
            `Invalid knowledge node ID '${node.id}'. Expected Kxxx or Sxxx.`
        );
    }
}


function validateDuplicateNodeId(
    context,
    node,
    basePath,
    reportedDuplicateIds
) {
    if (
        typeof node.id !== "string" ||
        !context.indexes
            .duplicateNodeIds
            .has(node.id)
    ) {
        return;
    }

    if (reportedDuplicateIds.has(node.id)) {
        return;
    }

    reportedDuplicateIds.add(node.id);

    addIssue(
        context,
        "KNOWLEDGE_DUPLICATE_NODE_ID",
        `${basePath}/id`,
        node.id,
        "Unique node ID",
        `Duplicate knowledge node ID '${node.id}'.`
    );
}


function validateNodeCluster(
    context,
    node,
    basePath
) {
    if (!("cluster" in node)) {
        return;
    }

    if (typeof node.cluster !== "string") {
        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${basePath}/cluster`,
            node.cluster,
            "string",
            "Node cluster must be a string."
        );

        return;
    }

    if (
        !context.indexes.clusterIds.has(
            node.cluster
        )
    ) {
        addIssue(
            context,
            "KNOWLEDGE_CLUSTER_NOT_FOUND",
            `${basePath}/cluster`,
            node.cluster,
            "Existing cluster ID",
            `Cluster '${node.cluster}' does not exist.`
        );
    }
}


function validateNodePriority(
    context,
    node,
    basePath
) {
    if (!("priority" in node)) {
        return;
    }

    if (
        !ALLOWED_PRIORITIES.has(
            node.priority
        )
    ) {
        addIssue(
            context,
            "KNOWLEDGE_INVALID_PRIORITY",
            `${basePath}/priority`,
            node.priority,
            [...ALLOWED_PRIORITIES],
            `Invalid priority '${node.priority}'.`
        );
    }
}


function validateNodeTargetMastery(
    context,
    node,
    basePath
) {
    if (!("targetMastery" in node)) {
        return;
    }

    if (
        !ALLOWED_TARGET_MASTERY.has(
            node.targetMastery
        )
    ) {
        addIssue(
            context,
            "KNOWLEDGE_INVALID_TARGET_MASTERY",
            `${basePath}/targetMastery`,
            node.targetMastery,
            [...ALLOWED_TARGET_MASTERY],
            `Invalid targetMastery '${node.targetMastery}'.`
        );
    }
}


/* =========================================================
 * DEPENDENCIES
 * ======================================================= */

function validateNodeDependencies(
    context,
    node,
    basePath
) {
    if (!("dependencies" in node)) {
        return;
    }

    if (!isPlainObject(node.dependencies)) {
        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${basePath}/dependencies`,
            node.dependencies,
            "object",
            "Node dependencies must be an object."
        );

        return;
    }

    /*
     * D1, D2 and D3 are required dependency groups.
     */
    for (
        const dependencyType
        of ALLOWED_DEPENDENCY_TYPES
    ) {
        const path =
            `${basePath}/dependencies/${dependencyType}`;

        if (
            !(dependencyType in node.dependencies)
        ) {
            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                path,
                undefined,
                "array",
                `Missing dependency group '${dependencyType}'.`
            );

            continue;
        }

        const dependencies =
            node.dependencies[dependencyType];

        if (!Array.isArray(dependencies)) {
            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                path,
                dependencies,
                "array",
                `${dependencyType} dependencies must be an array.`
            );

            continue;
        }

        validateDependencyArray(
            context,
            node,
            dependencyType,
            dependencies,
            path
        );
    }

    /*
     * Detect unsupported dependency types.
     */
    for (
        const dependencyType
        of Object.keys(node.dependencies)
    ) {
        if (
            !ALLOWED_DEPENDENCY_TYPES.has(
                dependencyType
            )
        ) {
            addIssue(
                context,
                "INVALID_ENUM_VALUE",
                `${basePath}/dependencies/${escapeJsonPointer(dependencyType)}`,
                dependencyType,
                [...ALLOWED_DEPENDENCY_TYPES],
                `Unsupported dependency type '${dependencyType}'.`
            );
        }
    }
}


function validateDependencyArray(
    context,
    node,
    dependencyType,
    dependencies,
    path
) {
    const seen = new Set();

    for (
        let index = 0;
        index < dependencies.length;
        index++
    ) {
        const dependencyId =
            dependencies[index];

        const dependencyPath =
            `${path}/${index}`;

        if (
            typeof dependencyId !== "string"
        ) {
            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                dependencyPath,
                dependencyId,
                "string",
                "Dependency ID must be a string."
            );

            continue;
        }

        /*
         * Duplicate dependency inside same type.
         *
         * No dedicated code was defined in V1 registry,
         * therefore INVALID_FORMAT is used temporarily.
         *
         * Recommended later:
         * KNOWLEDGE_DUPLICATE_DEPENDENCY
         */
        if (seen.has(dependencyId)) {
            addIssue(
                context,
                "INVALID_FORMAT",
                dependencyPath,
                dependencyId,
                "Unique dependency within dependency type",
                `Duplicate ${dependencyType} dependency '${dependencyId}' in node '${node.id}'.`
            );

            continue;
        }

        seen.add(dependencyId);

        /*
         * Self dependency
         */
        if (dependencyId === node.id) {
            addIssue(
                context,
                "KNOWLEDGE_SELF_DEPENDENCY",
                dependencyPath,
                dependencyId,
                "Dependency ID different from current node",
                `Node '${node.id}' cannot depend on itself.`
            );

            continue;
        }

        /*
         * Dependency reference
         */
        if (
            !context.indexes.nodesById.has(
                dependencyId
            )
        ) {
            addIssue(
                context,
                "KNOWLEDGE_DEPENDENCY_NOT_FOUND",
                dependencyPath,
                dependencyId,
                "Existing node ID",
                `Dependency '${dependencyId}' referenced by node '${node.id}' does not exist.`
            );
        }
    }
}


/* =========================================================
 * LEADS TO
 * ======================================================= */

function validateNodeLeadsTo(
    context,
    node,
    basePath
) {
    if (!("leadsTo" in node)) {
        return;
    }

    if (!Array.isArray(node.leadsTo)) {
        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${basePath}/leadsTo`,
            node.leadsTo,
            "array",
            "leadsTo must be an array."
        );

        return;
    }

    const seen = new Set();

    for (
        let index = 0;
        index < node.leadsTo.length;
        index++
    ) {
        const targetId =
            node.leadsTo[index];

        const path =
            `${basePath}/leadsTo/${index}`;

        if (typeof targetId !== "string") {
            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                path,
                targetId,
                "string",
                "leadsTo target must be a string."
            );

            continue;
        }

        /*
         * Duplicate leadsTo is invalid data.
         */
        if (seen.has(targetId)) {
            addIssue(
                context,
                "INVALID_FORMAT",
                path,
                targetId,
                "Unique leadsTo target",
                `Duplicate leadsTo target '${targetId}' in node '${node.id}'.`
            );

            continue;
        }

        seen.add(targetId);

        if (
            !context.indexes.nodesById.has(
                targetId
            )
        ) {
            addIssue(
                context,
                "KNOWLEDGE_LEADS_TO_NOT_FOUND",
                path,
                targetId,
                "Existing node ID",
                `leadsTo target '${targetId}' referenced by node '${node.id}' does not exist.`
            );
        }
    }
}


/* =========================================================
 * REFERENCE VALIDATION
 * ======================================================= */

function validateReferences(context) {
    /*
     * Most node-level references are validated during
     * validateNodes().
     *
     * This function intentionally exists as a separate
     * validation stage because future Knowledge Map
     * contracts may contain:
     *
     * - backbones
     * - coreClusters
     * - cluster node ranges
     * - other cross-map references
     *
     * Those checks belong here rather than inside
     * graph validation.
     */
}


/* =========================================================
 * DAG VALIDATION
 * ======================================================= */

/**
 * Validate that dependency graph is a DAG.
 *
 * All dependency types D1/D2/D3 participate because
 * dependencies as a whole must not create cycles.
 *
 * DFS states:
 *
 * 0 = unvisited
 * 1 = visiting
 * 2 = visited
 */
function validateDependencyGraph(context) {
    const nodes =
        context.knowledgeMap.nodes;

    const graph = new Map();

    /*
     * Build graph only from valid existing references.
     * Missing references are already reported separately.
     */
    for (const node of nodes) {
        if (
            !isPlainObject(node) ||
            typeof node.id !== "string"
        ) {
            continue;
        }

        const targets = [];

        if (isPlainObject(node.dependencies)) {
            for (
                const dependencyType
                of ALLOWED_DEPENDENCY_TYPES
            ) {
                const dependencies =
                    node.dependencies[
                    dependencyType
                    ];

                if (!Array.isArray(dependencies)) {
                    continue;
                }

                for (
                    const dependencyId
                    of dependencies
                ) {
                    if (
                        typeof dependencyId === "string" &&
                        dependencyId !== node.id &&
                        context.indexes
                            .nodesById
                            .has(dependencyId)
                    ) {
                        targets.push(
                            dependencyId
                        );
                    }
                }
            }
        }

        graph.set(
            node.id,
            [...new Set(targets)]
        );
    }

    const state = new Map();
    const stack = [];

    /*
     * Prevent reporting the exact same cycle repeatedly.
     */
    const reportedCycles = new Set();

    for (const nodeId of graph.keys()) {
        if ((state.get(nodeId) ?? 0) !== 0) {
            continue;
        }

        detectCycleFromNode(
            nodeId,
            graph,
            state,
            stack,
            reportedCycles,
            context
        );
    }
}


function detectCycleFromNode(
    nodeId,
    graph,
    state,
    stack,
    reportedCycles,
    context
) {
    state.set(nodeId, 1);
    stack.push(nodeId);

    const dependencies =
        graph.get(nodeId) ?? [];

    for (const dependencyId of dependencies) {
        const dependencyState =
            state.get(dependencyId) ?? 0;

        if (dependencyState === 0) {
            detectCycleFromNode(
                dependencyId,
                graph,
                state,
                stack,
                reportedCycles,
                context
            );

            continue;
        }

        if (dependencyState === 1) {
            const cycleStart =
                stack.indexOf(
                    dependencyId
                );

            const cycle =
                stack
                    .slice(cycleStart)
                    .concat(dependencyId);

            reportCycle(
                cycle,
                reportedCycles,
                context
            );
        }
    }

    stack.pop();
    state.set(nodeId, 2);
}


function reportCycle(
    cycle,
    reportedCycles,
    context
) {
    const normalized =
        normalizeCycle(cycle);

    const key =
        normalized.join("->");

    if (reportedCycles.has(key)) {
        return;
    }

    reportedCycles.add(key);

    addIssue(
        context,
        "KNOWLEDGE_CYCLE_DETECTED",
        "/nodes",
        cycle,
        "Acyclic dependency graph",
        `Dependency cycle detected: ${cycle.join(" -> ")}.`,
        cycle
            .slice(0, -1)
            .map(nodeId => ({
                type: "knowledge-node",
                id: nodeId
            }))
    );
}


/**
 * Normalize cycle representation so:
 *
 * K001 -> K002 -> K003 -> K001
 *
 * and
 *
 * K002 -> K003 -> K001 -> K002
 *
 * are treated as the same cycle.
 */
function normalizeCycle(cycle) {
    const nodes =
        cycle.slice(0, -1);

    if (nodes.length === 0) {
        return cycle;
    }

    let best = null;

    for (
        let index = 0;
        index < nodes.length;
        index++
    ) {
        const rotated = [
            ...nodes.slice(index),
            ...nodes.slice(0, index)
        ];

        const key = rotated.join("->");

        if (
            best === null ||
            key < best.key
        ) {
            best = {
                key,
                nodes: rotated
            };
        }
    }

    return [
        ...best.nodes,
        best.nodes[0]
    ];
}


/* =========================================================
 * ISSUE CREATION
 * ======================================================= */

function addIssue(
    context,
    code,
    path,
    value,
    expected,
    message,
    related
) {
    const metadata =
        resolveErrorMetadata(
            context,
            code
        );

    const issue = {
        code,
        severity: metadata.severity,
        category: metadata.category,
        message
    };

    if (path !== undefined) {
        issue.path = path;
    }

    if (value !== undefined) {
        issue.value = value;
    }

    if (expected !== undefined) {
        issue.expected = expected;
    }

    if (
        Array.isArray(related) &&
        related.length > 0
    ) {
        issue.related = related;
    }

    context.issues.push(issue);
}


function resolveErrorMetadata(
    context,
    code
) {
    /*
     * Preferred:
     *
     * errorRegistry.codes[code]
     */
    const registryEntry =
        context.errorRegistry
            ?.codes
        ?.[code];

    if (registryEntry) {
        return {
            severity:
                registryEntry.severity,

            category:
                registryEntry.category
        };
    }

    /*
     * Standalone fallback.
     */
    const fallback =
        ERROR_METADATA[code];

    if (!fallback) {
        throw new Error(
            `Validator attempted to emit unknown error code '${code}'.`
        );
    }

    return fallback;
}


/* =========================================================
 * REPORT
 * ======================================================= */

function buildValidationReport(
    context,
    durationMs
) {
    const issues = context.issues;

    const errorCount =
        issues.filter(
            issue =>
                issue.severity === "error"
        ).length;

    const warningCount =
        issues.filter(
            issue =>
                issue.severity === "warning"
        ).length;

    const infoCount =
        issues.filter(
            issue =>
                issue.severity === "info"
        ).length;

    return {
        schemaVersion: "1.0.0",

        validationId:
            createValidationId(),

        validator: {
            name: VALIDATOR_NAME,
            version: VALIDATOR_VERSION
        },

        target: {
            type: "knowledge-map",

            id:
                context.knowledgeMap
                    ?.metadata
                    ?.id ??
                context.knowledgeMap
                    ?.mapVersion ??
                null,

            path:
                context.targetPath
        },

        valid:
            errorCount === 0,

        summary: {
            errorCount,
            warningCount,
            infoCount
        },

        issues,

        metadata: {
            validatedAt:
                new Date().toISOString(),

            durationMs
        }
    };
}


/* =========================================================
 * HELPERS
 * ======================================================= */

function validateRequiredField(
    context,
    object,
    field,
    path
) {
    if (!(field in object)) {
        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            path,
            undefined,
            `Required field '${field}'`,
            `Required field '${field}' is missing.`
        );

        return false;
    }

    return true;
}


function getClusterId(cluster) {
    if (typeof cluster === "string") {
        return cluster;
    }

    if (
        isPlainObject(cluster) &&
        typeof cluster.id === "string"
    ) {
        return cluster.id;
    }

    return null;
}


function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function escapeJsonPointer(value) {
    return String(value)
        .replace(/~/g, "~0")
        .replace(/\//g, "~1");
}


function createValidationId() {
    return (
        "validation-knowledge-" +
        Date.now().toString(36)
    );
}