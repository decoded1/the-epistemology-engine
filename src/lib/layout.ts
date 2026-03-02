import Dagre from '@dagrejs/dagre';

export interface LayoutOptions {
    /** Graph direction. 'LR' = left→right (default). 'TB' = top→bottom. */
    direction?: 'LR' | 'TB';
    /** World-space point to centre the laid-out graph around. */
    center?: { x: number; y: number };
    /** Node width in px. ReactFlow nodes are 300px wide. */
    nodeWidth?: number;
    /** Node height estimate in px. Collapsed nodes are ~120px. */
    nodeHeight?: number;
    /** Dagre: vertical distance between ranks (columns in LR mode). */
    rankSep?: number;
    /** Dagre: horizontal distance between nodes in the same rank. */
    nodeSep?: number;
}

/**
 * Runs the Dagre Sugiyama layout algorithm on a set of node IDs and edges.
 *
 * Returns a map of  nodeId → { x, y }  where (x, y) is the ReactFlow
 * top-left corner position of each node (NOT the Dagre centre).
 *
 * Intentionally type-agnostic so it can be called from:
 *  - App.tsx  (with real AppNode IDs and AppEdge source/target)
 *  - cli.ts   (with tempIds and { from, to } pairs re-mapped by the caller)
 */
export function applyDagreLayout(
    nodeIds: string[],
    edges: { source: string; target: string }[],
    options: LayoutOptions = {},
): Record<string, { x: number; y: number }> {
    const {
        direction = 'LR',
        center = { x: 0, y: 0 },
        nodeWidth = 300,
        nodeHeight = 120,
        rankSep = 220,
        nodeSep = 100,
    } = options;

    if (!nodeIds.length) return {};

    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir: direction,
        ranksep: rankSep,
        nodesep: nodeSep,
        marginx: 40,
        marginy: 40,
    });

    const idSet = new Set(nodeIds);
    nodeIds.forEach(id => g.setNode(id, { width: nodeWidth, height: nodeHeight }));
    edges.forEach(e => {
        if (idSet.has(e.source) && idSet.has(e.target)) {
            g.setEdge(e.source, e.target);
        }
    });

    Dagre.layout(g);

    // Compute the bounding-box centre of the laid-out graph so we can
    // re-centre the whole thing onto the requested `center` point.
    const xs: number[] = [];
    const ys: number[] = [];
    nodeIds.forEach(id => {
        const n = g.node(id);
        if (n) { xs.push(n.x); ys.push(n.y); }
    });

    if (!xs.length) return {};

    const layoutCx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const layoutCy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const dx = center.x - layoutCx;
    const dy = center.y - layoutCy;

    const positions: Record<string, { x: number; y: number }> = {};
    nodeIds.forEach(id => {
        const n = g.node(id);
        if (!n) return;
        // Dagre gives us the node centre; ReactFlow wants the top-left corner.
        positions[id] = {
            x: Math.round(n.x - nodeWidth / 2 + dx),
            y: Math.round(n.y - nodeHeight / 2 + dy),
        };
    });

    return positions;
}
