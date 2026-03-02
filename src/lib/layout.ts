import Dagre from '@dagrejs/dagre';

/**
 * Advanced Dagre Layout Options
 */
export interface LayoutOptions {
    direction?: 'TB' | 'BT' | 'LR' | 'RL'; // Rank direction (Left-to-Right is usually best for webs)
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path'; // Algorithm to assign ranks
    acyclicer?: 'greedy' | undefined; // How to handle cycles
    nodesep?: number; // Horizontal separation between nodes (in LR)
    ranksep?: number; // Vertical separation between ranks (in LR)
    nodeWidth?: number; // Default width if not provided per-node
    nodeHeight?: number; // Default height if not provided per-node
    center?: { x: number; y: number };
}

/**
 * Individual node dimensions for precise layout
 */
export interface NodeDimensions {
    [nodeId: string]: { width: number; height: number };
}

/**
 * Shared layout utility using Dagre (Standardized Topological Engine)
 * 
 * Based on research into @dagrejs/dagre/dist/dagre.js:
 * - Uses SugarIyama-style ranking for clear hierarchies.
 * - Supports individual node dimensions for collision-free layout.
 * - Supports 'network-simplex' for optimal compact grouping.
 */
export function applyDagreLayout(
    nodeIds: string[],
    edges: { source: string; target: string }[],
    options: LayoutOptions = {},
    dimensions: NodeDimensions = {} // Real measured sizes from the frontend
) {
    const {
        direction = 'LR',
        ranker = 'network-simplex',
        acyclicer = 'greedy',
        nodesep = 50,
        ranksep = 80,
        nodeWidth = 300,
        nodeHeight = 120,
        center = { x: 0, y: 0 }
    } = options;

    const g = new Dagre.graphlib.Graph();

    // 1. Configure Graph
    g.setGraph({
        rankdir: direction,
        ranker: ranker,
        acyclicer: acyclicer,
        nodesep: nodesep,
        ranksep: ranksep,
        marginx: 0,
        marginy: 0,
    });

    g.setDefaultEdgeLabel(() => ({}));

    // 2. Set Nodes with individual dimensions
    nodeIds.forEach(id => {
        const dim = dimensions[id] || { width: nodeWidth, height: nodeHeight };
        g.setNode(id, {
            width: dim.width,
            height: dim.height
        });
    });

    // 3. Set Edges
    edges.forEach(edge => {
        g.setEdge(edge.source, edge.target);
    });

    // 4. Run Layout
    Dagre.layout(g);

    // 5. Compute bounding box for centering
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodeIds.forEach(id => {
        const node = g.node(id);
        const x = node.x;
        const y = node.y;
        const w = node.width;
        const h = node.height;

        minX = Math.min(minX, x - w / 2);
        maxX = Math.max(maxX, x + w / 2);
        minY = Math.min(minY, y - h / 2);
        maxY = Math.max(maxY, y + h / 2);
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    // 6. Return Map: Node ID -> Top-Left Position { x, y } (ReactFlow style)
    // Offset by centering point and subtract half-size since Dagre uses center-pos
    const result: Record<string, { x: number; y: number, rank?: number }> = {};
    nodeIds.forEach(id => {
        const node = g.node(id);
        result[id] = {
            x: center.x - (graphWidth / 2) + (node.x - minX) - (node.width / 2),
            y: center.y - (graphHeight / 2) + (node.y - minY) - (node.height / 2),
            rank: (node as any).rank // Keep rank info for metadata if needed
        };
    });

    return result;
}
