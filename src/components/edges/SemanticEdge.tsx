import React, { useState } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    Position,
    useInternalNode,
} from '@xyflow/react';
import { SemanticEdgeData, AppEdge } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';
import { X } from 'lucide-react';

// ─── Edge type visual config ──────────────────────────────────────────────────
const TYPE_CONFIG = {
    supports: { color: 'rgba(52,211,153,1)', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
    contradicts: { color: 'rgba(248,113,113,1)', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
    refines: { color: 'rgba(167,139,250,1)', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
    prerequisite: { color: 'rgba(104,137,255,1)', bg: 'rgba(104,137,255,0.1)', border: 'rgba(104,137,255,0.2)' },
    extends: { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
};

// Fixed node width (all nodes are 300 px wide by CSS).
// Height uses `measured.height` from the internal node so it adapts to
// collapsed (≈120 px) vs expanded (variable) state automatically.
const NODE_W = 300;
const NODE_H_FALLBACK = 120;

// ─── Angle-based handle computation ──────────────────────────────────────────
/**
 * Given the absolute top-left positions and measured dimensions of both nodes,
 * compute which handle sides minimize the angle between the two connection lines.
 *
 * This is the same approach used by ReactFlow's own SmoothStepEdge but applied
 * dynamically at render time instead of relying on the stored handle snapshot.
 *
 * Returns the best Positions and the pixel coordinates of each handle.
 */
function getBestHandles(
    srcX: number, srcY: number, srcW: number, srcH: number,
    tgtX: number, tgtY: number, tgtW: number, tgtH: number,
) {
    // Compute angle from source center → target center
    const srcCX = srcX + srcW / 2;
    const srcCY = srcY + srcH / 2;
    const tgtCX = tgtX + tgtW / 2;
    const tgtCY = tgtY + tgtH / 2;

    const deg = ((Math.atan2(tgtCY - srcCY, tgtCX - srcCX) * 180) / Math.PI + 360) % 360;

    let srcPos: Position;
    let tgtPos: Position;

    if (deg >= 315 || deg < 45) { srcPos = Position.Right; tgtPos = Position.Left; }
    else if (deg < 135) { srcPos = Position.Bottom; tgtPos = Position.Top; }
    else if (deg < 225) { srcPos = Position.Left; tgtPos = Position.Right; }
    else { srcPos = Position.Top; tgtPos = Position.Bottom; }

    // Map position enum → pixel offset from node top-left
    const handlePx = (x: number, y: number, w: number, h: number, pos: Position) => {
        switch (pos) {
            case Position.Right: return { x: x + w, y: y + h / 2 };
            case Position.Left: return { x, y: y + h / 2 };
            case Position.Bottom: return { x: x + w / 2, y: y + h };
            case Position.Top: return { x: x + w / 2, y };
        }
    };

    const s = handlePx(srcX, srcY, srcW, srcH, srcPos);
    const t = handlePx(tgtX, tgtY, tgtW, tgtH, tgtPos);

    return {
        sourcePosition: srcPos,
        targetPosition: tgtPos,
        sourceX: s.x,
        sourceY: s.y,
        targetX: t.x,
        targetY: t.y,
    };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SemanticEdge({
    id,
    source,            // node ID — officially included in EdgeProps v12
    target,            // node ID
    sourceX,           // ReactFlow fallback (used if nodes not yet measured)
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}: EdgeProps<AppEdge>) {
    const [isHovered, setIsHovered] = useState(false);
    const deleteEdges = useGraphStore(state => state.deleteEdges);

    // useInternalNode is the officially documented hook for reading live node
    // data inside custom edge components (ReactFlow v12 docs).
    // It re-renders this edge whenever the node moves OR is resized.
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    // Default to ReactFlow's computed values (pre-layout / not-yet-measured)
    let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY;
    let sPos = sourcePosition, tPos = targetPosition;

    if (sourceNode && targetNode) {
        // positionAbsolute is correct for sub-flows; plain `position` may be
        // relative to a parent node and would give wrong results.
        const sAbs = sourceNode.internals.positionAbsolute;
        const tAbs = targetNode.internals.positionAbsolute;

        // measured.height reflects actual rendered height: collapsed ≈120 px,
        // expanded nodes are taller. This is the key fix for edge routing.
        const sW = sourceNode.measured.width ?? NODE_W;
        const sH = sourceNode.measured.height ?? NODE_H_FALLBACK;
        const tW = targetNode.measured.width ?? NODE_W;
        const tH = targetNode.measured.height ?? NODE_H_FALLBACK;

        const best = getBestHandles(sAbs.x, sAbs.y, sW, sH, tAbs.x, tAbs.y, tW, tH);
        sx = best.sourceX; sy = best.sourceY;
        tx = best.targetX; ty = best.targetY;
        sPos = best.sourcePosition;
        tPos = best.targetPosition;
    }

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX: sx, sourceY: sy, sourcePosition: sPos,
        targetX: tx, targetY: ty, targetPosition: tPos,
    });

    const relation = data?.relationType || 'extends';
    const config = TYPE_CONFIG[relation as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.extends;

    return (
        <g
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Invisible wide path for easier hover / click target */}
            <BaseEdge path={edgePath} style={{ strokeWidth: 20, stroke: 'transparent' }} />

            {/* Visible styled path */}
            <BaseEdge
                path={edgePath}
                style={{
                    stroke: config.color,
                    strokeWidth: 2,
                    opacity: isHovered ? 0.9 : 0.5,
                    transition: 'stroke 0.2s ease, opacity 0.2s ease',
                }}
            />

            {/* Relation label + delete button */}
            <EdgeLabelRenderer>
                <div
                    className="absolute z-20"
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'auto',
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="flex items-center gap-1 group/label">
                        <div
                            className="px-2 py-[2px] rounded-lg text-[8px] font-mono font-bold uppercase tracking-widest backdrop-blur-sm transition-all"
                            style={{
                                color: config.color,
                                backgroundColor: config.bg,
                                border: `1px solid ${config.border}`,
                            }}
                        >
                            {relation}
                        </div>

                        {/* Delete button — expands on hover */}
                        <div
                            className={`flex items-center justify-center bg-bg-surface border border-border-base rounded transition-all cursor-pointer overflow-hidden
                                ${isHovered ? 'w-[20px] h-[20px] opacity-100' : 'w-0 h-[20px] opacity-0 border-transparent'}
                                hover:bg-accent-red-muted hover:border-accent-red-muted hover:text-accent-red text-text-dim`}
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteEdges([id]);
                            }}
                        >
                            <X size={12} className="min-w-[12px]" />
                        </div>
                    </div>
                </div>
            </EdgeLabelRenderer>
        </g>
    );
}