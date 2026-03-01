/**
 * Graphology Adapter
 * 
 * Converts between NodeBasedKnowledgeGraph and graphology Graph format.
 * This allows us to leverage graphology's algorithms and data structures.
 */

import Graph from 'graphology';
import type { 
  NodeBasedKnowledgeGraph, 
  GraphNode, 
  Relationship as NodeBasedRelationship 
} from '../../types/nodeBasedKnowledgeGraph';

/**
 * Convert NodeBasedKnowledgeGraph to graphology Graph
 */
export function toGraphologyGraph(nodeBasedGraph: NodeBasedKnowledgeGraph): Graph {
  const graph = new Graph({ multi: false, type: 'directed' });

  // Add all nodes
  for (const [nodeId, node] of Object.entries(nodeBasedGraph.nodes)) {
    graph.addNode(nodeId, {
      type: node.type,
      properties: node.properties,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    });
  }

  // Add all relationships as edges
  for (const rel of nodeBasedGraph.relationships) {
    // Skip if nodes don't exist (shouldn't happen, but safety check)
    if (!graph.hasNode(rel.source) || !graph.hasNode(rel.target)) {
      console.warn(`Skipping relationship ${rel.id}: source or target node not found`);
      continue;
    }

    // Check if edge already exists
    if (graph.hasEdge(rel.source, rel.target)) {
      // For multi-graph, we could add multiple edges, but we're using single edges
      // Store relationship metadata in edge attributes
      const existingEdge = graph.edge(rel.source, rel.target);
      if (existingEdge) {
        // Merge relationship types if multiple relationships exist
        const existingTypes = graph.getEdgeAttribute(existingEdge, 'relationshipTypes') || [];
        if (!existingTypes.includes(rel.type)) {
          graph.setEdgeAttribute(existingEdge, 'relationshipTypes', [...existingTypes, rel.type]);
        }
      }
    } else {
      graph.addEdge(rel.source, rel.target, {
        id: rel.id,
        relationshipType: rel.type,
        relationshipTypes: [rel.type], // Array for multiple relationship types
        direction: rel.direction,
        strength: rel.strength || 1.0,
        metadata: rel.metadata || {},
        createdAt: rel.createdAt,
      });
    }
  }

  return graph;
}

/**
 * Convert graphology Graph to NodeBasedKnowledgeGraph
 */
export function fromGraphologyGraph(
  graph: Graph,
  originalGraph?: NodeBasedKnowledgeGraph
): NodeBasedKnowledgeGraph {
  const nodes: Record<string, GraphNode> = {};
  const relationships: NodeBasedRelationship[] = [];
  const nodeTypes: NodeBasedKnowledgeGraph['nodeTypes'] = {
    Graph: [],
    Concept: [],
    Layer: [],
    LearningGoal: [],
    Milestone: [],
    PracticeExercise: [],
    Lesson: [],
    ConceptMetadata: [],
    GraphMetadata: [],
    FlashCard: [],
  };

  // Extract nodes
  graph.forEachNode((nodeId: string, attributes: any) => {
    const node: GraphNode = {
      id: nodeId,
      type: attributes.type as GraphNode['type'],
      properties: attributes.properties || {},
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
    };
    nodes[nodeId] = node;
    const typeArray = nodeTypes[node.type];
    if (typeArray) {
      typeArray.push(nodeId);
    }
  });

  // Extract relationships
  graph.forEachEdge((edgeId: string, attributes: any, source: string, target: string) => {
    const relationshipTypes = attributes.relationshipTypes || [attributes.relationshipType];
    
    // Create a relationship for each type
    for (const relType of relationshipTypes) {
      relationships.push({
        id: attributes.id || `${source}->${target}->${relType}`,
        source,
        target,
        type: relType as NodeBasedRelationship['type'],
        direction: (attributes.direction || 'forward') as NodeBasedRelationship['direction'],
        strength: attributes.strength,
        metadata: attributes.metadata,
        createdAt: attributes.createdAt,
      });
    }
  });

  // Use original graph metadata if provided, otherwise create minimal structure
  const graphId = originalGraph?.id || 'unknown';
  const seedConceptId = originalGraph?.seedConceptId || '';

  return {
    id: graphId,
    seedConceptId,
    nodes,
    nodeTypes,
    relationships,
    createdAt: originalGraph?.createdAt || Date.now(),
    updatedAt: Date.now(),
    model: originalGraph?.model,
    goalFocused: originalGraph?.goalFocused,
    difficulty: originalGraph?.difficulty,
    focus: originalGraph?.focus,
    name: originalGraph?.name || graphId,
  };
}

/**
 * Create a new graphology graph from a NodeBasedKnowledgeGraph
 */
export function createGraphologyGraph(nodeBasedGraph: NodeBasedKnowledgeGraph): Graph {
  return toGraphologyGraph(nodeBasedGraph);
}

