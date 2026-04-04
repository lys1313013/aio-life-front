import { ShortTree } from 'short-tree';
import { RotatedArraySet } from 'rotated-array-set';
import { compare } from 'fast-string-compare';
import { uniq, uniqArrays } from './util.js';
export * from './types.js';
export { sortFullAnalysisResult, sortFastAnalysisResult } from './util.js';
// Removes duplicate edges (they are ignored), and ensures single
function buildAndEnsureValidGraph(edges) {
    const fromSet = new Set();
    edges.forEach(([from]) => {
        if (fromSet.has(from))
            throw new Error(`Duplicate edge specification from "${from}"`);
        fromSet.add(from);
    });
    return new Map(edges.map(([from, to]) => [from, uniq(to)]));
}
export function analyzeGraph(graph) {
    const graphMap = buildAndEnsureValidGraph(graph);
    const entrypoints = new ShortTree(compare);
    const cycleNodes = new Set();
    const cycles = new RotatedArraySet();
    const dependencies = new Set();
    const allExitPaths = new Array();
    const recordCycleEntrypoint = (path) => {
        if (path.length === 0)
            return;
        entrypoints.insert(path);
    };
    const recordCycle = (path) => {
        if (cycles.add(path)) {
            for (const node of path)
                cycleNodes.add(node);
        }
    };
    const isPartOfCycle = (node) => cycleNodes.has(node);
    // Traverse from each possible entrypoint
    for (const [from, _to] of graphMap.entries()) {
        const path = [from];
        const visited = new Set();
        let foundCycle = false;
        let createdCycle = false;
        const exitPaths = [];
        // Traversal
        let to = _to;
        let nodeNextIndex = 0;
        const getLeaf = () => path[path.length - 1];
        // Return true if we should turn around the traversal, if we've
        // entered a known cycle from a non-cycle entrypoint.
        const testNode = () => {
            const node = getLeaf();
            const shouldCheckCycles = !createdCycle;
            if (shouldCheckCycles && isPartOfCycle(node)) {
                recordCycleEntrypoint(path.slice(0, -1));
                foundCycle = true;
                return true;
            }
            // Cycled back to itself
            if (visited.has(node)) {
                // Record entrypoint to cycle
                const entrypointPath = path.slice(0, path.indexOf(node) + 1);
                // Only record entrypoints if there's at least one node
                // *before* the cycle begins
                if (entrypointPath.length > 1)
                    recordCycleEntrypoint(entrypointPath.slice(0, -1));
                const cycle = path.slice(path.indexOf(node), -1);
                recordCycle(cycle);
                createdCycle = true;
                return true;
            }
            return false;
        };
        // Returns true if walking down was successful
        const walkDown = () => {
            var _a;
            if (nodeNextIndex >= to.length)
                return false;
            const node = getLeaf();
            visited.add(node);
            const nextLeaf = to[nodeNextIndex];
            path.push(nextLeaf);
            to = (_a = graphMap.get(nextLeaf)) !== null && _a !== void 0 ? _a : [];
            nodeNextIndex = 0;
            return true;
        };
        // Returns true if walking up is not possible anymore (root is reached)
        const walkUp = () => {
            var _a;
            if (path.length === 1)
                return true;
            const lastLeaf = getLeaf();
            path.pop();
            const node = getLeaf();
            visited.delete(node);
            to = (_a = graphMap.get(node)) !== null && _a !== void 0 ? _a : [];
            nodeNextIndex = to.indexOf(lastLeaf) + 1;
            if (nodeNextIndex >= to.length)
                return walkUp();
            else
                walkDown();
            return false;
        };
        while (true) {
            if (testNode()) {
                if (walkUp())
                    break;
                else
                    continue;
            }
            if (walkDown())
                continue;
            // Save path up to this exitpoint.
            // If the path along the way here was part of a cycle, its
            // detection will mark this exitpoint as a dependence.
            exitPaths.push([...path]);
            if (walkUp())
                break;
        }
        // If cycles were found, test exit nodes against cycles to find
        // dependencies
        if (foundCycle || createdCycle)
            exitPaths.forEach(path => {
                while (path.length > 0 &&
                    !isPartOfCycle(path[path.length - 1])) {
                    dependencies.add(path[path.length - 1]);
                    path.pop();
                }
            });
        for (const path of exitPaths)
            allExitPaths.push(path);
    }
    // There might be cycles found as part of an entrypoint *after* the
    // entrypoint was detected. Chop them off at the time of entering a cycle.
    const trimmedEntrypoints = uniqArrays(entrypoints.values()
        .map(path => {
        for (let i = 0; i < path.length; ++i) {
            if (isPartOfCycle(path[i])) {
                path = path.slice(0, i);
                break;
            }
        }
        return path;
    })
        .filter(path => path.length > 0));
    const all = new Set([...cycleNodes, ...trimmedEntrypoints.flat()]);
    const dependenciesList = [...dependencies].filter(dep => !all.has(dep));
    const allInclDeps = new Set([...all, ...dependenciesList]);
    const dependents = new Set();
    allExitPaths.forEach(path => {
        if (path.length > 0 && allInclDeps.has(path[path.length - 1])) {
            const prePath = path.slice(0, -1);
            if (prePath.some(node => allInclDeps.has(node)))
                return;
            // This is a free floating path leading up to a dependency of
            // cyclic nodes
            prePath.forEach(node => dependents.add(node));
        }
    });
    return {
        cycles: cycles.values(),
        entrypoints: trimmedEntrypoints,
        dependencies: dependenciesList,
        dependents: [...dependents],
        all: [...all],
    };
}
export function analyzeGraphFast(graph) {
    const graphMap = buildAndEnsureValidGraph(graph);
    const cycleNodes = new Set();
    const dependencies = new Set();
    const dependents = new Set();
    const exitPaths = [];
    const recordCycle = (path) => {
        for (const node of path)
            cycleNodes.add(node);
    };
    const isPartOfCycle = (node) => cycleNodes.has(node);
    // Traverse from each possible entrypoint
    for (const [from, _to] of graphMap.entries()) {
        const path = [from];
        const visited = new Set();
        // Traversal
        let to = _to;
        let nodeNextIndex = 0;
        const getLeaf = () => path[path.length - 1];
        // Return true if we should turn around the traversal, if we've
        // entered a known cycle from a non-cycle entrypoint.
        const testNode = () => {
            const node = getLeaf();
            if (isPartOfCycle(node)) {
                // Is any other node up to this point part of a cycle,
                // the whole path from that point is
                recordCycle(path.slice(0, -1));
                return true;
            }
            // Cycled back to itself
            if (visited.has(node)) {
                const cycle = path.slice(0, -1);
                recordCycle(cycle);
                return true;
            }
            return false;
        };
        // Returns true if walking down was successful
        const walkDown = () => {
            var _a;
            if (nodeNextIndex >= to.length)
                return false;
            const node = getLeaf();
            visited.add(node);
            const nextLeaf = to[nodeNextIndex];
            path.push(nextLeaf);
            to = (_a = graphMap.get(nextLeaf)) !== null && _a !== void 0 ? _a : [];
            nodeNextIndex = 0;
            return true;
        };
        // Returns true if walking up is not possible anymore (root is reached)
        const walkUp = () => {
            var _a;
            if (path.length === 1)
                return true;
            const lastLeaf = getLeaf();
            path.pop();
            const node = getLeaf();
            visited.delete(node);
            to = (_a = graphMap.get(node)) !== null && _a !== void 0 ? _a : [];
            nodeNextIndex = to.indexOf(lastLeaf) + 1;
            if (nodeNextIndex >= to.length)
                return walkUp();
            else
                walkDown();
            return false;
        };
        while (true) {
            if (testNode()) {
                if (walkUp())
                    break;
                else
                    continue;
            }
            if (walkDown())
                continue;
            // Save path up to this exitpoint.
            // If the path along the way here was part of a cycle, its
            // detection will mark this exitpoint as a dependence.
            exitPaths.push([...path]);
            if (walkUp())
                break;
        }
    }
    // Find dependencies
    exitPaths.forEach(origPath => {
        const path = [...origPath];
        const localPath = [];
        while (path.length > 0 &&
            !isPartOfCycle(path[path.length - 1])) {
            localPath.push(path[path.length - 1]);
            path.pop();
        }
        if (path.length > 0)
            // There is a cycle before, so it's an exit path (not a completely uncyclic cluster)
            localPath.forEach(segment => dependencies.add(segment));
    });
    const all = new Set([...dependencies, ...cycleNodes]);
    // Find dependents
    exitPaths.forEach(path => {
        if (path.length > 0 && all.has(path[path.length - 1])) {
            const prePath = path.slice(0, -1);
            if (prePath.some(node => all.has(node)))
                return;
            // This is a free floating path leading up to a dependency of
            // cyclic nodes
            prePath.forEach(node => dependents.add(node));
        }
    });
    return {
        cyclic: [...cycleNodes],
        dependencies: [...dependencies]
            .filter(dep => !cycleNodes.has(dep)),
        dependents: [...dependents]
            .filter(dep => !cycleNodes.has(dep)),
    };
}
