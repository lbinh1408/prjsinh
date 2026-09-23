const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/Users/doducqunynhtram/Documents/projects/prjsinh/data/knowledge/knowledge-map-v4.json', 'utf8'));
const nodes = data.nodes || [];

let hasErrors = false;

// 1. Check for duplicate IDs
const nodeIds = new Set();
const duplicateIds = new Set();
nodes.forEach(node => {
    if (nodeIds.has(node.id)) {
        duplicateIds.add(node.id);
    }
    nodeIds.add(node.id);
});

if (duplicateIds.size > 0) {
    console.error("1. ERROR: Duplicate IDs found:", Array.from(duplicateIds));
    hasErrors = true;
} else {
    console.log("1. PASS: No duplicate IDs.");
}

// 2. Check for dependencies pointing to non-existent IDs
const invalidDeps = [];
nodes.forEach(node => {
    if (node.dependencies) {
        for (const type of ['D1', 'D2', 'D3']) {
            const deps = node.dependencies[type] || [];
            deps.forEach(depId => {
                if (!nodeIds.has(depId)) {
                    invalidDeps.push(`Node ${node.id} depends on non-existent ${depId} (type ${type})`);
                }
            });
        }
    }
    if (node.leadsTo) {
        node.leadsTo.forEach(targetId => {
            if (!nodeIds.has(targetId)) {
                invalidDeps.push(`Node ${node.id} leadsTo non-existent ${targetId}`);
            }
        });
    }
});

if (invalidDeps.length > 0) {
    console.error("2. ERROR: Invalid dependencies found:");
    invalidDeps.forEach(err => console.error("  ", err));
    hasErrors = true;
} else {
    console.log("2. PASS: No dependencies to non-existent IDs.");
}

// Build D1 graph
const d1Graph = {}; // node -> array of nodes it depends on via D1
nodes.forEach(node => {
    d1Graph[node.id] = [];
    if (node.dependencies && node.dependencies.D1) {
        node.dependencies.D1.forEach(depId => {
            d1Graph[node.id].push(depId);
        });
    }
});

// 3. Check for D1 cycles
const visited = new Set();
const recursionStack = new Set();
let cycleFound = false;

function detectCycle(nodeId, path) {
    if (recursionStack.has(nodeId)) {
        console.error("3. ERROR: Cycle detected in D1 dependencies:", path.join(" -> ") + " -> " + nodeId);
        cycleFound = true;
        return true;
    }
    if (visited.has(nodeId)) {
        return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const deps = d1Graph[nodeId] || [];
    for (const dep of deps) {
        if (detectCycle(dep, [...path, nodeId])) {
            return true;
        }
    }

    recursionStack.delete(nodeId);
    return false;
}

for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
        detectCycle(nodeId, []);
    }
}

if (!cycleFound) {
    console.log("3. PASS: No cycles in D1 dependencies.");
} else {
    hasErrors = true;
}

// 4. leadsTo does not contradict D1
let leadsToContradiction = false;

// Function to check if target is reachable from start in D1 graph
function isReachable(start, target) {
    const q = [start];
    const visitedNodes = new Set([start]);
    while (q.length > 0) {
        const curr = q.shift();
        if (curr === target) return true;
        const deps = d1Graph[curr] || [];
        for (const dep of deps) {
            if (!visitedNodes.has(dep)) {
                visitedNodes.add(dep);
                q.push(dep);
            }
        }
    }
    return false;
}

nodes.forEach(node => {
    if (node.leadsTo) {
        node.leadsTo.forEach(targetId => {
            // A = node.id, B = targetId
            // A leadsTo B.
            if (isReachable(node.id, targetId)) {
                console.error(`4. ERROR: leadsTo contradiction. Node ${node.id} leadsTo ${targetId}, but ${node.id} also depends on ${targetId} via D1.`);
                leadsToContradiction = true;
            }
        });
    }
});

if (!leadsToContradiction) {
    console.log("4. PASS: leadsTo does not contradict D1.");
} else {
    hasErrors = true;
}

if (hasErrors) {
    process.exit(1);
} else {
    console.log("All checks passed successfully!");
}
