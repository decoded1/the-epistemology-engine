import { create } from 'zustand';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    Connection,
    EdgeChange,
    NodeChange,
    Position,
} from '@xyflow/react';
import { AppNode, AppEdge, Excerpt, Source, AppNodeData } from '../types';
import type { LayoutNodeResult } from '../lib/layout';

const API_URL = 'http://localhost:3001/api';

interface GraphState {
    nodes: AppNode[];
    edges: AppEdge[];
    excerpts: Excerpt[];
    sources: Source[];
    isDockOpen: boolean;
    fitViewTrigger: number;  // increment to signal EpistemologyGraph to refit

    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;

    addNode: (node: AppNode) => void;
    addEdges: (edges: AppEdge[]) => void;
    updateNodeData: (id: string, data: Partial<AppNodeData>) => void;
    updateEdgeData: (id: string, data: Partial<AppEdge['data']>) => void;
    deleteNodes: (ids: string[]) => void;
    deleteEdges: (ids: string[]) => void;
    setDockOpen: (isOpen: boolean) => void;
    triggerFitView: () => void;
    repositionNodes: (positions: Record<string, { x: number; y: number; sourcePosition?: Position; targetPosition?: Position }>) => void;
    assignExcerpt: (excerptId: string, nodeId: string) => void;
    dismissExcerpt: (excerptId: string) => void;

    setExcerpts: (excerpts: Excerpt[]) => void;
    fetchUnsortedExcerpts: () => Promise<void>;
    fetchGraph: () => Promise<void>;
    fetchSources: () => Promise<void>;
}


export const useGraphStore = create<GraphState>((set, get) => ({
    nodes: [],
    edges: [],
    excerpts: [],
    sources: [],
    isDockOpen: false,
    fitViewTrigger: 0,

    triggerFitView: () => set(state => ({ fitViewTrigger: state.fitViewTrigger + 1 })),

    onNodesChange: (changes: NodeChange[]) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) as AppNode[] });

        // Sync removals to backend (backend also cleans up connected edges)
        changes.filter(c => c.type === 'remove').forEach(c => {
            fetch(`${API_URL}/graph/nodes/${(c as any).id}`, { method: 'DELETE' }).catch(console.error);
        });

        // Sync position drops to backend
        const positionDrops = changes.filter(
            (c): c is typeof c & { id: string; dragging: boolean } =>
                c.type === 'position' && (c as any).dragging === false
        );
        if (positionDrops.length > 0) {
            const currentNodes = get().nodes;
            positionDrops.forEach(change => {
                const node = currentNodes.find(n => n.id === change.id);
                if (node) {
                    fetch(`${API_URL}/graph/nodes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(node)
                    }).catch(console.error);
                }
            });
        }
    },

    onEdgesChange: (changes: EdgeChange[]) => {
        set({ edges: applyEdgeChanges(changes, get().edges) as AppEdge[] });

        // Sync removals to backend
        changes.filter(c => c.type === 'remove').forEach(c => {
            fetch(`${API_URL}/graph/edges/${(c as any).id}`, { method: 'DELETE' }).catch(console.error);
        });
    },

    onConnect: (connection: Connection) => {
        const newEdge: AppEdge = {
            ...connection,
            id: `e-${Date.now()}`,
            type: 'semantic',
            data: { relationType: 'extends' },
        } as AppEdge;
        set({ edges: addEdge(newEdge, get().edges) as AppEdge[] });

        // Save new edge
        fetch(`${API_URL}/graph/edges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEdge)
        }).catch(console.error);
    },

    addNode: (node: AppNode) => {
        set({ nodes: [...get().nodes, node] });

        // Save new node
        fetch(`${API_URL}/graph/nodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(node)
        }).catch(console.error);
    },

    addEdges: (newEdges: AppEdge[]) => {
        set({ edges: [...get().edges, ...newEdges] });

        newEdges.forEach(edge =>
            fetch(`${API_URL}/graph/edges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(edge)
            }).catch(console.error)
        );
    },

    updateNodeData: (id: string, dataUpdate: Partial<AppNodeData>) => {
        const newNodes = get().nodes.map((node) => {
            if (node.id === id) return { ...node, data: { ...node.data, ...dataUpdate } };
            return node;
        });
        set({ nodes: newNodes });

        // Save node data updates (descriptions, conviction meter changes, etc.)
        const updatedNode = newNodes.find(n => n.id === id);
        if (updatedNode) {
            fetch(`${API_URL}/graph/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedNode)
            }).catch(console.error);
        }
    },

    updateEdgeData: (id: string, dataUpdate: Partial<AppEdge['data']>) => {
        const newEdges = get().edges.map((edge) => {
            if (edge.id === id) return { ...edge, data: { ...edge.data, ...dataUpdate } };
            return edge;
        });
        set({ edges: newEdges });

        const updatedEdge = newEdges.find(e => e.id === id);
        if (updatedEdge) {
            fetch(`${API_URL}/graph/edges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEdge)
            }).catch(console.error);
        }
    },

    deleteNodes: (ids: string[]) => {
        set({
            nodes: get().nodes.filter((node) => !ids.includes(node.id)),
            edges: get().edges.filter((edge) => !ids.includes(edge.source) && !ids.includes(edge.target)),
        });

        ids.forEach(id => {
            fetch(`${API_URL}/graph/nodes/${id}`, { method: 'DELETE' }).catch(console.error);
        });
    },

    deleteEdges: (ids: string[]) => {
        set({ edges: get().edges.filter((edge) => !ids.includes(edge.id)) });

        ids.forEach(id => {
            fetch(`${API_URL}/graph/edges/${id}`, { method: 'DELETE' }).catch(console.error);
        });
    },

    setDockOpen: (isOpen: boolean) => {
        set({ isDockOpen: isOpen });
    },

    repositionNodes: (positions: Record<string, { x: number; y: number; sourcePosition?: Position; targetPosition?: Position }>) => {
        const newNodes = get().nodes.map(n => {
            const pos = positions[n.id];
            if (!pos) return n;
            return {
                ...n,
                position: { x: pos.x, y: pos.y },
                // Apply direction-aware handle positions from layout (reference pattern)
                ...(pos.sourcePosition ? { sourcePosition: pos.sourcePosition } : {}),
                ...(pos.targetPosition ? { targetPosition: pos.targetPosition } : {}),
            };
        });
        set({ nodes: newNodes });
        // Persist every repositioned node to SQLite
        newNodes.forEach(node => {
            if (positions[node.id]) {
                fetch(`${API_URL}/graph/nodes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(node),
                }).catch(console.error);
            }
        });
    },

    assignExcerpt: (excerptId: string, nodeId: string) => {
        const { excerpts, nodes } = get();
        const excerpt = excerpts.find(e => e.id === excerptId);
        if (!excerpt) return;

        const newExcerpts = excerpts.filter(e => e.id !== excerptId);
        const newNodes = nodes.map(node => {
            if (node.id === nodeId) {
                const newRef = {
                    id: excerpt.id,
                    sourceName: excerpt.sourceName,
                    location: excerpt.location,
                    text: excerpt.text,
                    timestamp: excerpt.sourceType === 'yt' ? excerpt.location : undefined,
                    timelineProgress: 0,
                };
                const updatedData = { ...node.data } as any;

                if (node.type === 'concept' || node.type === 'branch') {
                    const isMedia = excerpt.sourceType === 'yt';
                    updatedData.references = {
                        literature: [...(updatedData.references?.literature || [])],
                        media: [...(updatedData.references?.media || [])]
                    };
                    if (isMedia) updatedData.references.media.push(newRef);
                    else updatedData.references.literature.push(newRef);
                } else if (node.type === 'claim') {
                    updatedData.supportingEvidence = [...(updatedData.supportingEvidence || []), newRef];
                }
                return { ...node, data: updatedData };
            }
            return node;
        });

        set({ excerpts: newExcerpts, nodes: newNodes });

        // Mark excerpt as assigned
        fetch(`${API_URL}/excerpts/${excerptId}/assign`, { method: 'PATCH' }).catch(console.error);

        // Persist the updated node with its new reference
        const updatedNode = newNodes.find(n => n.id === nodeId);
        if (updatedNode) {
            fetch(`${API_URL}/graph/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedNode)
            }).catch(console.error);
        }
    },

    dismissExcerpt: (excerptId: string) => {
        set({ excerpts: get().excerpts.filter(e => e.id !== excerptId) });
        fetch(`${API_URL}/excerpts/${excerptId}`, { method: 'DELETE' }).catch(console.error);
    },

    setExcerpts: (excerpts: Excerpt[]) => {
        set({ excerpts });
    },

    fetchUnsortedExcerpts: async () => {
        try {
            const res = await fetch(`${API_URL}/excerpts/unsorted`);
            if (!res.ok) throw new Error('Failed to fetch excerpts');
            const data = await res.json();
            const currentExcerpts = get().excerpts;
            if (data.length !== currentExcerpts.length) {
                set({ excerpts: data });
            }
        } catch (error) {
            console.error('Error hydrating dock:', error);
        }
    },

    // Load initial canvas state from SQLite
    fetchGraph: async () => {
        try {
            const res = await fetch(`${API_URL}/graph`);
            if (!res.ok) throw new Error('Failed to fetch graph data');
            const { nodes, edges } = await res.json();
            set({ nodes, edges });
        } catch (error) {
            console.error('Error hydrating graph:', error);
        }
    },

    fetchSources: async () => {
        try {
            const res = await fetch(`${API_URL}/sources`);
            if (!res.ok) throw new Error('Failed to fetch sources');
            const data = await res.json();
            set({ sources: data });
        } catch (error) {
            console.error('Error fetching sources:', error);
        }
    },
}));