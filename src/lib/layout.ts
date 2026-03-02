import Dagre from '@dagrejs/dagre';

/**
 * Advanced Dagre Layout Options
 */
export interface LayoutOptions {
    direction?: 'TB' | 'BT' | 'LR' | 'RL';
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
    acyclicer?: 'greedy' | undefined;
    nodesep?: number;
    ranksep?: number;
    nodeWidth?: number;
    nodeHeight?: number;
    center?: { x: number; y: number };
    /**
     * Semantic Edge Weighting — "Relational Clustering"
     *
     * Discovered via research in @dagrejs/dagre/dist/dagre.d.ts + dagre.js:
     *
     *   EdgeConfig.weight  (default: 1)
     *     Higher weight = Dagre prioritizes placing these nodes on adjacent ranks.
     *     Strong edges "pull" their nodes together into a cluster.
     *
     *   EdgeConfig.minlen  (default: 1)
     *     Higher minlen = *more* rank-steps must exist between source and target.
     *     Semantically-opposing edges "push" their nodes apart.
     *
     * By mapping semantic relation types to weight/minlen pairs we get automatic
     * relational clustering WITHOUT needing compound groups or external algorithms.
     */
    semanticWeighting?: boolean;
}

// ── Semantic weight table ─────────────────────────────────────────────────────
// Source: research in @dagrejs/dagre/dist/dagre.d.ts (EdgeConfig interface)
// and dagre.js edgeDefaults (line 1977-1984) which set weight:1, minlen:1.
const EDGE_WEIGHTS: Record<string, { weight: number; minlen: number }> = {
    prerequisite: { weight: 5, minlen: 1 }, // Very strong pull — dependencies must stay adjacent
    supports: { weight: 3, minlen: 1 }, // Strong pull — evidence clusters near its claim
    refines: { weight: 3, minlen: 1 }, // Strong pull — refinements stay near what they refine
    extends: { weight: 2, minlen: 1 }, // Medium pull — extensions near their origin
    contradicts: { weight: 1, minlen: 2 }, // Weak pull + pushes apart — opposing ideas stay separated
};

/**
 * Individual node dimensions for precise layout
 */
export interface NodeDimensions {
    [nodeId: string]: { width: number; height: number };
}

/**
 * Edge with optional semantic relation type for weighting
 */
export interface LayoutEdge {
    source: string;
    target: string;
    relationType?: string;
}

/**
 * Shared layout utility using Dagre (Standardized Topological Engine)
 *
 * Key research findings applied:
 * 1. Individual node dimensions — prevents overlaps with expanded nodes.
 * 2. `network-simplex` ranker — minimises edge lengths for tighter hierarchy.
 * 3. `greedy` acyclicer — handles back-edges in epistemological cycles.
 * 4. Semantic edge weighting — pulls related nodes into relational clusters,
 *    pushes contradicting nodes apart. This is the closest thing to
 *    "relational clustering" that Dagre natively supports.
 */
export function applyDagreLayout(
    nodeIds: string[],
    edges: LayoutEdge[],
    options: LayoutOptions = {},
    dimensions: NodeDimensions = {}
) {
    const {
        direction = 'LR',
        ranker = 'network-simplex',
        acyclicer = 'greedy',
        nodesep = 60,
        ranksep = 120,
        nodeWidth = 300,
        nodeHeight = 120,
        center = { x: 0, y: 0 },
        semanticWeighting = true,
    } = options;

    const g = new Dagre.graphlib.Graph();

    g.setGraph({
        rankdir: direction,
        ranker: ranker,
        acyclicer: acyclicer,
        nodesep: nodesep,
        ranksep: ranksep,
        marginx: 40,
        marginy: 40,
    });

    g.setDefaultEdgeLabel(() => ({}));

    // Set nodes with measured dimensions
    nodeIds.forEach(id => {
        const dim = dimensions[id] || { width: nodeWidth, height: nodeHeight };
        g.setNode(id, { width: dim.width, height: dim.height });
    });

    // Set edges — with semantic weighting if enabled
    edges.forEach(edge => {
        const weights = semanticWeighting && edge.relationType
            ? (EDGE_WEIGHTS[edge.relationType] ?? { weight: 1, minlen: 1 })
            : { weight: 1, minlen: 1 };

        g.setEdge(edge.source, edge.target, {
            weight: weights.weight,
            minlen: weights.minlen,
        });
    });

    Dagre.layout(g);

    // Compute bounding box for centering
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodeIds.forEach(id => {
        const n = g.node(id);
        minX = Math.min(minX, n.x - n.width / 2);
        maxX = Math.max(maxX, n.x + n.width / 2);
        minY = Math.min(minY, n.y - n.height / 2);
        maxY = Math.max(maxY, n.y + n.height / 2);
    });

    const gW = maxX - minX;
    const gH = maxY - minY;

    // Return ReactFlow-style top-left positions
    const result: Record<string, { x: number; y: number; rank?: number }> = {};
    nodeIds.forEach(id => {
        const n = g.node(id);
        result[id] = {
            x: center.x - gW / 2 + (n.x - minX) - n.width / 2,
            y: center.y - gH / 2 + (n.y - minY) - n.height / 2,
            rank: (n as any).rank,
        };
    });

    return result;
}
