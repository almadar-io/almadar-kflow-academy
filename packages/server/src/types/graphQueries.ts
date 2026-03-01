/**
 * Graph Query Types
 * 
 * Types for optimized query endpoints that return pre-formatted,
 * display-ready data for Mentor pages.
 */

/**
 * Learning Path Summary (for MentorPage)
 */
export interface LearningPathSummary {
  id: string;
  title: string;
  description: string;
  conceptCount: number;
  seedConcept: {
    id: string;
    name: string;
    description: string;
  } | null;
  updatedAt: number;
  createdAt: number;
}

export interface LearningPathsSummaryResponse {
  learningPaths: LearningPathSummary[];
}

/**
 * Graph Summary (for MentorConceptListPage header)
 */
export interface GraphSummary {
  id: string;
  goal: {
    id: string;
    title: string;
    description: string;
    type: string;
    target: string;
  } | null;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    targetDate?: number;
    completed: boolean;
  }>;
  conceptCount: number;
  layerCount: number;
  seedConcept: {
    id: string;
    name: string;
  } | null;
  updatedAt: number;
}

/**
 * Concept Display (for MentorConceptListPage)
 */
export interface ConceptDisplay {
  id: string;
  name: string;
  description: string;
  layer: number;
  isSeed: boolean;
  sequence?: number;
  parents: string[];
  children: string[];
  prerequisites: string[];
  properties: Record<string, any>;
}

export interface ConceptsByLayerResponse {
  concepts: ConceptDisplay[];
  groupedByLayer?: Record<number, ConceptDisplay[]>;
  layerInfo: Array<{
    layerNumber: number;
    conceptCount: number;
    goal?: string;
  }>;
}

/**
 * Concept Detail (for MentorConceptDetailPage)
 */
export interface ConceptDetail {
  concept: ConceptDisplay;
  lesson: {
    id: string;
    content: string;
    prerequisites: string[];
  } | null;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
  }>;
  metadata: {
    qa: Array<{
      question: string;
      answer: string;
    }>;
  } | null;
  relationships: {
    parents: Array<{
      id: string;
      name: string;
    }>;
    children: Array<{
      id: string;
      name: string;
    }>;
    prerequisites: Array<{
      id: string;
      name: string;
    }>;
  };
}

/**
 * MindMap Node (for MindMap component)
 * 
 * Represents a node in the mindmap structure, converted from NodeBasedKnowledgeGraph.
 * This structure matches the Note interface expected by the MindMap component.
 */
export interface MindMapNode {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  parentId?: string;
  children: string[];
  level: number;
  isExpanded: boolean;
  nodeType: string; // 'Concept' | 'Layer' | etc.
  metadata?: {
    layer?: number;
    isSeed?: boolean;
    sequence?: number;
    layerNumber?: number;
    goal?: string;
    [key: string]: any;
  };
}

/**
 * MindMap Response
 * 
 * Response from the mindmap query endpoint containing all nodes
 * and metadata for the mindmap visualization.
 */
export interface MindMapResponse {
  nodes: MindMapNode[];
  seedNodeId: string;
  totalNodes: number;
  layerCount: number;
  conceptCount: number;
}

