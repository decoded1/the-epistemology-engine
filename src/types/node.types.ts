import { Node } from '@xyflow/react';

export type AppNodeType = 'concept' | 'branch' | 'source' | 'claim';

export interface Reference {
  id: string;
  sourceName: string;
  location?: string;
  text?: string;
  timestamp?: string;
  timelineProgress?: number;
}

export interface BaseNodeData extends Record<string, unknown> {
  title: string;
  description: string;
  tags?: string[];
  expanded?: boolean;
}

export interface ConceptNodeData extends BaseNodeData {
  references?: {
    literature: Reference[];
    media: Reference[];
  };
  synthesis?: string;
}

export interface BranchNodeData extends ConceptNodeData { }

export interface SourceNodeData extends BaseNodeData {
  sourceMeta?: {
    format: string;
    chapters: number;
    excerpts: number;
    linked: number;
    indexed: number;
    size: string;
  };
}

export interface ClaimNodeData extends BaseNodeData {
  conviction?: number;
  supportingEvidence?: Reference[];
  counterEvidence?: Reference[];
}

export type ConceptNode = Node<ConceptNodeData, 'concept'>;
export type BranchNode = Node<BranchNodeData, 'branch'>;
export type SourceNode = Node<SourceNodeData, 'source'>;
export type ClaimNode = Node<ClaimNodeData, 'claim'>;

export type AppNodeData = ConceptNodeData | BranchNodeData | SourceNodeData | ClaimNodeData;
export type AppNode = ConceptNode | BranchNode | SourceNode | ClaimNode;