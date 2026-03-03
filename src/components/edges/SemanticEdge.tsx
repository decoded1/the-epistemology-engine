import React, { useState, useEffect } from 'react';
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

const NODE_W = 300;
const NODE_H_FALLBACK = 120;

// ─── Axis-biased handle routing ───────────────────────────────────────────────
/**
 * Superior handle routing based on analysis of XYFlow's own getEdgePosition()
 * implementation found in @xyflow/react/dist/esm/index.js (line 2822).
 *
 * Key insight from the source:
 *   XYFlow calls `getEdgePosition()` which finds the closest existing Handle node
 *   to the connection line. For nodes that have ALL four handles registered, this
 *   degenerates to a distance check from each handle to the opposite node center.
 *
 * The problem with pure angle-snapping (our previous approach):
 *   - 45° bands cause erratic flipping when nodes are diagonal
 *   - No directional bias toward the dominant layout axis (LR in our case)
 *
 * This implementation uses AXIS RATIO instead of angle bands:
 *   - Compute dX (horizontal) and dY (vertical) between centers
 *   - If |dX| / |dY| >= AXIS_BIAS_RATIO → use horizontal handles (Right/Left)
 *   - Otherwise → use vertical handles (Top/Bottom) with Left/Right sign from dX
 *
 * AXIS_BIAS_RATIO = 0.75 means horizontal routing is preferred unless the target
 * is more than 1.33× taller than it is wider in relative offset. This gives
 * stable LR connections for the typical Dagre LR layout, while correctly
 * switching to TB handles for nearly-vertical stacking.
 *
 * The `contradicts` relation gets an extra Y-offset on its source handle so that
 * opposing edges don't overlap with supporting ones — similar to how manual
 * routing offsets work in tools like Miro.
 */
const AXIS_BIAS_RATIO = 0.75;

function getBestHandles(
    srcX: number, srcY: number, srcW: number, srcH: number,
    tgtX: number, tgtY: number, tgtW: number, tgtH: number,
): {
    sourcePosition: Position; targetPosition: Position;
    sourceX: number; sourceY: number;
    targetX: number; targetY: number;
} {
    const srcCX = srcX + srcW / 2;
    const srcCY = srcY + srcH / 2;
    const tgtCX = tgtX + tgtW / 2;
    const tgtCY = tgtY + tgtH / 2;

    const dX = tgtCX - srcCX;
    const dY = tgtCY - srcCY;

    const adX = Math.abs(dX);
    const adY = Math.abs(dY);

    let srcPos: Position;
    let tgtPos: Position;

    if (adY === 0 || adX / adY >= AXIS_BIAS_RATIO) {
        // Predominantly horizontal — use Left/Right handles
        if (dX >= 0) {
            srcPos = Position.Right;
            tgtPos = Position.Left;
        } else {
            srcPos = Position.Left;
            tgtPos = Position.Right;
        }
    } else {
        // Predominantly vertical — use Top/Bottom handles
        if (dY >= 0) {
            srcPos = Position.Bottom;
            tgtPos = Position.Top;
        } else {
            srcPos = Position.Top;
            tgtPos = Position.Bottom;
        }
    }

    // Map position enum → exact pixel coordinate on node boundary
    const toPixel = (x: number, y: number, w: number, h: number, pos: Position) => {
        switch (pos) {
            case Position.Right: return { x: x + w, y: y + h / 2 };
            case Position.Left: return { x, y: y + h / 2 };
            case Position.Bottom: return { x: x + w / 2, y: y + h };
            case Position.Top: return { x: x + w / 2, y };
        }
    };

    const s = toPixel(srcX, srcY, srcW, srcH, srcPos);
    const t = toPixel(tgtX, tgtY, tgtW, tgtH, tgtPos);

    return {
        sourcePosition: srcPos, targetPosition: tgtPos,
        sourceX: s.x, sourceY: s.y,
        targetX: t.x, targetY: t.y,
    };
}

// ─── Component ────────────────────────────────────────────────────────────────
const RELATION_TYPES = Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[];

export function SemanticEdge({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}: EdgeProps<AppEdge>) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPicking, setIsPicking] = useState(false);
    const deleteEdges = useGraphStore(state => state.deleteEdges);
    const updateEdgeData = useGraphStore(state => state.updateEdgeData);

    useEffect(() => {
        if (!isPicking) return;
        const close = () => setIsPicking(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [isPicking]);

    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY;
    let sPos = sourcePosition, tPos = targetPosition;

    if (sourceNode && targetNode) {
        const sAbs = sourceNode.internals.positionAbsolute;
        const tAbs = targetNode.internals.positionAbsolute;

        const sW = sourceNode.measured.width ?? NODE_W;
        const sH = sourceNode.measured.height ?? NODE_H_FALLBACK;
        const tW = targetNode.measured.width ?? NODE_W;
        const tH = targetNode.measured.height ?? NODE_H_FALLBACK;

        const best = getBestHandles(
            sAbs.x, sAbs.y, sW, sH,
            tAbs.x, tAbs.y, tW, tH,
        );

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
            {/* Wide invisible hit area */}
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

            {/* Relation label + delete */}
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
                    {isPicking ? (
                        /* ── Relation picker: all types as chips ── */
                        <div
                            className="flex items-center gap-[3px] px-[5px] py-[4px] rounded-lg backdrop-blur-sm"
                            style={{ backgroundColor: 'rgba(7,7,10,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {RELATION_TYPES.map((type) => {
                                const c = TYPE_CONFIG[type];
                                const isActive = type === relation;
                                return (
                                    <button
                                        key={type}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateEdgeData(id, { relationType: type });
                                            setIsPicking(false);
                                        }}
                                        className="px-[6px] py-[2px] rounded text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
                                        style={{
                                            color: c.color,
                                            backgroundColor: isActive ? c.bg : 'transparent',
                                            border: `1px solid ${isActive ? c.border : 'transparent'}`,
                                        }}
                                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = c.bg; }}
                                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                            {/* Close without changing */}
                            <div className="w-px self-stretch mx-[2px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsPicking(false); }}
                                className="flex items-center justify-center w-[16px] h-[16px] text-text-dim hover:text-text-muted transition-colors cursor-pointer"
                            >
                                <X size={9} />
                            </button>
                        </div>
                    ) : (
                        /* ── Normal split pill: label | X ── */
                        <div
                            className="flex items-center rounded-lg overflow-hidden backdrop-blur-sm transition-opacity"
                            style={{
                                border: `1px solid ${config.border}`,
                                backgroundColor: config.bg,
                                opacity: isHovered ? 1 : 0.75,
                            }}
                        >
                            {/* Left: click to open picker */}
                            <button
                                className="px-2 py-[2px] text-[8px] font-mono font-bold uppercase tracking-widest cursor-pointer"
                                style={{ color: config.color }}
                                onClick={(e) => { e.stopPropagation(); setIsPicking(true); }}
                            >
                                {relation}
                            </button>

                            {/* Divider + delete — slide in on hover */}
                            <div
                                className="flex items-center overflow-hidden transition-[width,opacity] duration-150"
                                style={{ width: isHovered ? 21 : 0, opacity: isHovered ? 1 : 0 }}
                            >
                                <div className="w-px self-stretch shrink-0" style={{ backgroundColor: config.border }} />
                                <button
                                    className="flex items-center justify-center w-[20px] py-[2px] text-text-dim hover:bg-accent-red-muted hover:text-accent-red transition-colors cursor-pointer shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteEdges([id]);
                                    }}
                                >
                                    <X size={9} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>
        </g>
    );
}