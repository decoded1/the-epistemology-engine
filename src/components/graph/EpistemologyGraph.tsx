import React, { useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Viewport,
    SelectionMode,
    ConnectionMode,
    useReactFlow,
    type ReactFlowInstance,
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

// ── Double-tap zoom cycling ───────────────────────────────────────────────────
// Levels: fitView overview → comfortable reading → focused detail → back to fitView
// Discovered via node_modules: instance.zoomTo(level, { duration }) calls
// panZoom.scaleTo() which animates. instance.getZoom() reads transform[2].
const ZOOM_LEVELS = [1.0, 1.6] as const;
const ZOOM_DURATION = 350;

// Asymmetric padding accounts for the fixed console bar at the bottom.
// Measured live via cx2: console bar top=832px on a 986px viewport,
// height=131px, positioned at bottom:24px → occupies ~155px from bottom.
// We give 160px bottom clearance so nodes never hide behind it.
const FIT_PADDING = {
    top: 40,
    right: 40,
    bottom: 160,   // console bar clearance
    left: 40,
} as const;

const FIT_OPTIONS = { padding: FIT_PADDING, duration: ZOOM_DURATION, minZoom: 0.1, maxZoom: 1.5 } as const;


interface EpistemologyGraphProps {
    onViewportChange: (viewport: Viewport) => void;
    snapToGrid?: boolean;
    snapGrid?: [number, number];
}

export function EpistemologyGraph({ onViewportChange, snapToGrid = true, snapGrid = SNAP }: EpistemologyGraphProps) {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGraphStore();
    const { getViewport } = useReactFlow();
    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
    // Tracks which step of the zoom cycle we're on.
    // -1 means we're at fitView (overview), 0-N are ZOOM_LEVELS indices.
    const zoomStepRef = useRef<number>(-1);

    const handleMove = useCallback(() => {
        onViewportChange(getViewport());
    }, [getViewport, onViewportChange]);

    // onInit — fires when viewport is ready (component-props.d.ts line 176).
    // Async fitView after 150ms covers the DB-fetch delay.
    const handleInit = useCallback((instance: ReactFlowInstance) => {
        rfInstanceRef.current = instance;
        setTimeout(() => {
            instance.fitView(FIT_OPTIONS);
            zoomStepRef.current = -1;
        }, 150);
    }, []);

    // Double-tap / double-click on canvas → cycle zoom levels.
    // At the last level, resets to fitView (overview).
    const handlePaneDoubleClick = useCallback((_e: React.MouseEvent) => {
        const instance = rfInstanceRef.current;
        if (!instance) return;

        const nextStep = zoomStepRef.current + 1;

        if (nextStep >= ZOOM_LEVELS.length) {
            // Cycled through all levels → back to overview
            instance.fitView(FIT_OPTIONS);
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
                // Disable XYFlow's default double-click zoom-at-cursor so our
                // cycling handler has full control.
                zoomOnDoubleClick={false}
                onDoubleClick={handlePaneDoubleClick}
                connectionMode={ConnectionMode.Loose}
                snapToGrid={snapToGrid}
                snapGrid={snapGrid}
                fitView
                fitViewOptions={FIT_OPTIONS}
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