import Dagre from '@dagrejs/dagre';
import { Position } from '@xyflow/react';

/**
 * Layout Options
 *
 * Inspired by the XYFlow official Dagre example (xyflow-branching-tree reference):
 * - Keep config minimal — just rankdir, nodesep, ranksep
 * - Return sourcePosition/targetPosition per node so edges know which handles to use
 * - Complex options (ranker, align, acyclicer) are available but shouldn't be defaults
 */
export interface LayoutOptions {
    direction?: 'TB' | 'BT' | 'LR' | 'RL';
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
    acyclicer?: 'greedy' | undefined;
    align?: 'UL' | 'UR' | 'DL' | 'DR';
    nodesep?: number;
    ranksep?: number;
    nodeWidth?: number;
    nodeHeight?: number;
    center?: { x: number; y: number };
    semanticWeighting?: boolean;
}

// Semantic edge weight table (EdgeConfig.weight / minlen from dagre.d.ts)
const EDGE_WEIGHTS: Record<string, { weight: number; minlen: number }> = {
    prerequisite: { weight: 5, minlen: 1 },
    supports: { weight: 3, minlen: 1 },
    refines: { weight: 3, minlen: 1 },
    extends: { weight: 2, minlen: 1 },
    contradicts: { weight: 1, minlen: 2 },
};

export interface NodeDimensions {
    [nodeId: string]: { width: number; height: number };
}

export interface LayoutEdge {
    source: string;
    target: string;
    relationType?: string;
}

// What we return per node — matches the reference pattern
export interface LayoutNodeResult {
    x: number;
    y: number;
    sourcePosition: Position;
    targetPosition: Position;
    rank?: number;
}

/**
 * Dagre layout — returns positions AND sourcePosition/targetPosition per node.
 *
 * Key insight from the xyflow-branching-tree reference (./src/App.tsx):
 *   The reference sets sourcePosition/targetPosition on every node based on
 *   direction, so edges know which handles to connect through. Without this,
 *   edges pick arbitrary handles making the tree look messy even when the
 *   underlying positions are correct.
 *
 *   TB: source=Bottom, target=Top   (edges flow downward)
 *   LR: source=Right,  target=Left  (edges flow rightward)
 */
export function applyDagreLayout(
    nodeIds: string[],
    edges: LayoutEdge[],
    options: LayoutOptions = {},
    dimensions: NodeDimensions = {}
): Record<string, LayoutNodeResult> {
    const {
        direction = 'TB',
        nodesep = 80,
        ranksep = 160,
        nodeWidth = 300,
        nodeHeight = 120,
        center = { x: 0, y: 0 },
        semanticWeighting = false,
        // Advanced — only set if explicitly provided
        ranker,
        acyclicer,
        align,
    } = options;

    const isHorizontal = direction === 'LR' || direction === 'RL';

    // Source/target positions derived from direction — mirrors the reference exactly
    const sourcePosition: Position = isHorizontal ? Position.Right : Position.Bottom;
    const targetPosition: Position = isHorizontal ? Position.Left : Position.Top;

    // Fresh graph every call — no stale state
    const g = new Dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));

    // Only include advanced options when explicitly set
    const graphConfig: Record<string, unknown> = {
        rankdir: direction,
        nodesep,
        ranksep,
        marginx: 40,
        marginy: 40,
    };
    if (ranker) graphConfig.ranker = ranker;
    if (acyclicer) graphConfig.acyclicer = acyclicer;
    if (align) graphConfig.align = align;

    g.setGraph(graphConfig);

    nodeIds.forEach(id => {
        const dim = dimensions[id] || { width: nodeWidth, height: nodeHeight };
        g.setNode(id, { width: dim.width, height: dim.height });
    });

    edges.forEach(edge => {
        const weights = semanticWeighting && edge.relationType
            ? (EDGE_WEIGHTS[edge.relationType] ?? { weight: 1, minlen: 1 })
            : { weight: 1, minlen: 1 };
        g.setEdge(edge.source, edge.target, { weight: weights.weight, minlen: weights.minlen });
    });

    Dagre.layout(g);

    // Bounding box for centering
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

    const result: Record<string, LayoutNodeResult> = {};
    nodeIds.forEach(id => {
        const n = g.node(id);
        result[id] = {
            // Top-left anchor (ReactFlow convention), centered on canvas
            x: center.x - gW / 2 + (n.x - minX) - n.width / 2,
            y: center.y - gH / 2 + (n.y - minY) - n.height / 2,
            sourcePosition,
            targetPosition,
            rank: (n as any).rank,
        };
    });

    return result;
}
