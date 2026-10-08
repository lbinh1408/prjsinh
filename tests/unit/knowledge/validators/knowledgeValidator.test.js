import test from 'node:test';
import assert from 'node:assert/strict';
import { validateKnowledgeMap } from '../../../../src/engines/knowledge/validators/knowledgeValidator.js';

function createValidMap() {
    return {
        schemaVersion: "1.0.0",
        mapVersion: "1.0.0",
        clusters: [
            { id: "C01", name: "Cluster 1" }
        ],
        nodes: [
            {
                id: "K001",
                name: "Node 1",
                cluster: "C01",
                priority: "P1",
                targetMastery: "M2",
                dependencies: { D1: [], D2: [], D3: [] },
                leadsTo: ["K002"]
            },
            {
                id: "K002",
                name: "Node 2",
                cluster: "C01",
                priority: "P1",
                targetMastery: "M3",
                dependencies: { D1: ["K001"], D2: [], D3: [] },
                leadsTo: []
            }
        ]
    };
}

function assertHasErrorCode(report, expectedCode) {
    assert.equal(report.valid, false, "Report should be marked as invalid");
    const hasCode = report.issues.some(issue => issue.code === expectedCode);
    assert.ok(hasCode, `Expected report to contain issue with code: ${expectedCode}. Found: ${report.issues.map(i => i.code).join(', ')}`);
}

function ensureNoMutation(originalMap, mapToTest) {
    // Stringify to compare structures to ensure the validator did not mutate the input
    assert.deepEqual(JSON.parse(JSON.stringify(mapToTest)), originalMap, "Knowledge Map was mutated during validation!");
}

test('knowledgeValidator V1 test suite', async (t) => {
    
    await t.test('Base case should be valid', () => {
        const map = createValidMap();
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assert.equal(report.valid, true, "Base map should be valid");
        ensureNoMutation(originalMap, map);
    });

    await t.test('1. duplicate ID', () => {
        const map = createValidMap();
        map.nodes.push({ ...map.nodes[0] }); // duplicate K001
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_DUPLICATE_NODE_ID");
        ensureNoMutation(originalMap, map);
    });

    await t.test('2. missing dependency', () => {
        const map = createValidMap();
        map.nodes[1].dependencies.D1.push("K999");
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_DEPENDENCY_NOT_FOUND");
        ensureNoMutation(originalMap, map);
    });

    await t.test('3. self-dependency', () => {
        const map = createValidMap();
        map.nodes[1].dependencies.D1.push("K002");
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_SELF_DEPENDENCY");
        ensureNoMutation(originalMap, map);
    });

    await t.test('4. cycle', () => {
        const map = createValidMap();
        // K001 depends on K002, K002 depends on K001
        map.nodes[0].dependencies.D1.push("K002");
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_CYCLE_DETECTED");
        ensureNoMutation(originalMap, map);
    });

    await t.test('5. bad cluster', () => {
        const map = createValidMap();
        map.nodes[0].cluster = "C999";
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_CLUSTER_NOT_FOUND");
        ensureNoMutation(originalMap, map);
    });

    await t.test('6. bad priority', () => {
        const map = createValidMap();
        map.nodes[0].priority = "P99";
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_INVALID_PRIORITY");
        ensureNoMutation(originalMap, map);
    });

    await t.test('7. bad mastery', () => {
        const map = createValidMap();
        map.nodes[0].targetMastery = "M99";
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_INVALID_TARGET_MASTERY");
        ensureNoMutation(originalMap, map);
    });

    await t.test('8. bad ID', () => {
        const map = createValidMap();
        map.nodes[0].id = "INVALID_NODE";
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "INVALID_FORMAT"); // Regex check fails
        ensureNoMutation(originalMap, map);
    });

    await t.test('9. duplicate dependency', () => {
        const map = createValidMap();
        map.nodes[1].dependencies.D1 = ["K001", "K001"];
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "INVALID_FORMAT"); // V1 throws INVALID_FORMAT for duplicate dep
        ensureNoMutation(originalMap, map);
    });

    await t.test('10. bad leadsTo', () => {
        const map = createValidMap();
        map.nodes[0].leadsTo = ["K002", "K999"];
        const originalMap = JSON.parse(JSON.stringify(map));
        const report = validateKnowledgeMap(map);
        assertHasErrorCode(report, "KNOWLEDGE_LEADS_TO_NOT_FOUND");
        ensureNoMutation(originalMap, map);
    });
});
