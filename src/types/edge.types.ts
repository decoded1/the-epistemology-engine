import { Edge } from '@xyflow/react';

export type SemanticRelationType = 'supports' | 'contradicts' | 'refines' | 'prerequisite' | 'extends';

export interface SemanticEdgeData extends Record<string, unknown> {
  relationType: SemanticRelationType;
}

export type AppEdge = Edge<SemanticEdgeData, 'semantic'>;