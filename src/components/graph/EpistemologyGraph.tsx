import React, { useCallback, useEffect, useRef } from 'react';

import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Viewport,
    SelectionMode,
    ConnectionMode,
    useReactFlow,
    type ReactFlowInstance,
    getNodesBounds,
    getViewportForBounds,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../../store/useGraphStore';
import { ConceptNode } from '../nodes/ConceptNode';
import { BranchNode } from '../nodes/BranchNode';
import { SourceNode } from '../nodes/SourceNode';
import { ClaimNode } from '../nodes/ClaimNode';
import { SemanticEdge } from '../edges/SemanticEdge';

const nodeTypes = {
    concept: ConceptNode,
    branch: BranchNode,
    source: SourceNode,
    claim: ClaimNode,
};

const edgeTypes = {
    semantic: SemanticEdge,
};

const connectionLineStyle = {
    stroke: 'rgba(104, 137, 255, 0.8)',
    strokeWidth: 2,
    strokeDasharray: '4 4',
};

const SNAP: [number, number] = [20, 20];

// ── Zoom cycling ──────────────────────────────────────────────────────────────
const ZOOM_LEVELS = [1.0, 1.6] as const;
const ZOOM_DURATION = 350;
const SIDE_PAD = 40;   // left / right margin in px
const TOP_PAD = 40;   // top margin in px
const BOTTOM_PAD = 40;   // gap between nodes and console top in px
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 1.5;

/**
 * Reads the console bar's live top position from the DOM.
 * Falls back to 85% of the viewport height if the element isn't found.
 */
function getConsoleTop(): number {
    const allFixed = Array.from(document.querySelectorAll('[class*="fixed"]')) as HTMLElement[];
    const consoleEl = allFixed.find(el => !!el.querySelector('input[type="text"]'));
    return consoleEl
        ? consoleEl.getBoundingClientRect().top
        : window.innerHeight * 0.85;
}

/**
 * Fits the graph into the usable canvas area (everything above the console bar)
 * using getViewportForBounds + a live DOM measurement of the console position.
 *
 * This gives perfect symmetric margins: SIDE_PAD on left/right,
 * TOP_PAD from the canvas top, BOTTOM_PAD gap above the console.
 */
function fitToUsableArea(instance: ReactFlowInstance, animate = true): void {
    const nodes = instance.getNodes().filter(n => !n.hidden);
    if (!nodes.length) return;

    const consoleTop = getConsoleTop();

    // Usable rectangle: full width minus side pads, height from top to console-gap
    const usableW = window.innerWidth - SIDE_PAD * 2;
    const usableH = consoleTop - TOP_PAD - BOTTOM_PAD;

    const bounds = getNodesBounds(nodes);
    if (!bounds.width || !bounds.height) return;

    // getViewportForBounds centres the graph within (usableW × usableH)
    // with an additional 5% internal padding so nodes aren't flush to the edges.
    const { x, y, zoom } = getViewportForBounds(
        bounds,
        usableW,
        usableH,
        MIN_ZOOM,
        MAX_ZOOM,
        0.05
    );

    // Shift by SIDE_PAD / TOP_PAD so the usable area starts at (40, 40) on screen.
    instance.setViewport(
        { x: x + SIDE_PAD, y: y + TOP_PAD, zoom },
        { duration: animate ? ZOOM_DURATION : 0 }
    );
}

interface EpistemologyGraphProps {
    onViewportChange: (viewport: Viewport) => void;
    snapToGrid?: boolean;
    snapGrid?: [number, number];
}

export function EpistemologyGraph({ onViewportChange, snapToGrid = true, snapGrid = SNAP }: EpistemologyGraphProps) {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGraphStore();
    const fitViewTrigger = useGraphStore(state => state.fitViewTrigger);
    const { getViewport } = useReactFlow();

    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
    // -1 = at overview, 0-N = ZOOM_LEVELS index
    const zoomStepRef = useRef<number>(-1);

    const handleMove = useCallback(() => {
        onViewportChange(getViewport());
    }, [getViewport, onViewportChange]);

    // Re-fit whenever applyLayout or handleAcceptSuggestion increments fitViewTrigger.
    useEffect(() => {
        if (fitViewTrigger === 0) return;   // skip the initial value
        const instance = rfInstanceRef.current;
        if (!instance) return;
        // Small delay so Zustand node positions have been painted before we measure.
        setTimeout(() => fitToUsableArea(instance), 60);
    }, [fitViewTrigger]);

    // onInit — fires when viewport is ready.
    // We delay 200ms to allow the DB-fetch to populate nodes before measuring.
    const handleInit = useCallback((instance: ReactFlowInstance) => {
        rfInstanceRef.current = instance;
        setTimeout(() => {
            fitToUsableArea(instance);
            zoomStepRef.current = -1;
        }, 200);
    }, []);

    // Double-click on canvas → cycle zoom levels → back to overview.
    const handlePaneDoubleClick = useCallback((_e: React.MouseEvent) => {
        const instance = rfInstanceRef.current;
        if (!instance) return;

        const nextStep = zoomStepRef.current + 1;

        if (nextStep >= ZOOM_LEVELS.length) {
            fitToUsableArea(instance);
            zoomStepRef.current = -1;
        } else {
            instance.zoomTo(ZOOM_LEVELS[nextStep], { duration: ZOOM_DURATION });
            zoomStepRef.current = nextStep;
        }
    }, []);

    return (
        <div className="w-full h-full" style={{ background: 'var(--color-bg-void)' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onMove={handleMove}
                onInit={handleInit}
                onPaneClick={undefined}
                zoomOnDoubleClick={false}
                onDoubleClick={handlePaneDoubleClick}
                connectionMode={ConnectionMode.Loose}
                snapToGrid={snapToGrid}
                snapGrid={snapGrid}
                selectionOnDrag
                panOnScroll
                selectionMode={SelectionMode.Partial}
                connectionLineStyle={connectionLineStyle}
                defaultEdgeOptions={{ type: 'semantic' }}
                minZoom={0.15}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={snapGrid[0]}
                    size={1}
                    color="rgba(255, 255, 255, 0.06)"
                />
            </ReactFlow>
        </div>
    );
}