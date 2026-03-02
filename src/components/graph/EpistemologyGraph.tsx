import React, { useCallback } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Viewport,
    SelectionMode,
    ConnectionMode,
    useReactFlow
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
    strokeDasharray: '4 4'
};

const SNAP: [number, number] = [20, 20];

interface EpistemologyGraphProps {
    onViewportChange: (viewport: Viewport) => void;
    snapToGrid?: boolean;
    snapGrid?: [number, number];
}

export function EpistemologyGraph({ onViewportChange, snapToGrid = true, snapGrid = SNAP }: EpistemologyGraphProps) {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGraphStore();
    const { getViewport } = useReactFlow();

    const handleMove = useCallback(() => {
        onViewportChange(getViewport());
    }, [getViewport, onViewportChange]);

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