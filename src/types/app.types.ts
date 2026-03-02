import { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { AppNode, AppNodeData } from './node.types';
import { AppEdge } from './edge.types';

export interface Excerpt {
  id: string;
  sourceName: string;
  sourceType: 'epub' | 'jsonl' | 'yt';
  status: 'orphan' | 'new';
  text: string;
  tags: string[];
  location: string;
}

export interface Source {
  id: string;
  name: string;
  type: 'epub' | 'jsonl' | 'yt';
  meta: string;
}

export interface GraphState {
  nodes: AppNode[];
  edges: AppEdge[];
  excerpts: Excerpt[];
  sources: Source[];
  isDockOpen: boolean;

  // Actions
  setNodes: (nodes: AppNode[] | ((nodes: AppNode[]) => AppNode[])) => void;
  setEdges: (edges: AppEdge[] | ((edges: AppEdge[]) => AppEdge[])) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (node: AppNode) => void;
  updateNodeData: (id: string, data: Partial<AppNodeData>) => void;
  deleteNodes: (ids: string[]) => void;
  deleteEdges: (ids: string[]) => void;
  setDockOpen: (isOpen: boolean) => void;
  assignExcerpt: (excerptId: string, nodeId: string) => void;
  dismissExcerpt: (excerptId: string) => void;
  setExcerpts: (excerpts: Excerpt[]) => void;
  fetchUnsortedExcerpts: () => Promise<void>;
}