/**
 * Graph Algorithm Service
 * 
 * Handles graph algorithms like path finding, traversal, and subgraph extraction.
 */

import { bidirectional } from 'graphology-shortest-path';
import type { GraphLoader } from '../core/GraphLoader';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  RelationshipType,
} from '../../../types/nodeBasedKnowledgeGraph';

export interface TraverseOptions {
  relationshipTypes?: RelationshipType[];
  direction?: 'incoming' | 'outgoing' | 'both';
  maxDepth?: number;
  limit?: number;
  filter?: (node: GraphNode) => boolean;
}

export interface TraverseResult {
  nodes: GraphNode[];
  relationships: Relationship[];
  depth: number;
  visited: string[];
}

export class GraphAlgorithmService {
  constructor(private loader: GraphLoader) {}

  /**
   * Find shortest path between two nodes
   * @param maxDepth - Optional maximum path length (not yet implemented, reserved for future use)
   */
  async findPath(
    uid: string,
    graphId: string,
    from: string,
    to: string,
    _maxDepth?: number
  ): Promise<GraphNode[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    const graphologyGraph = await this.loader.getGraphologyGraph(uid, graphId);

    try {
      const path = bidirectional(graphologyGraph, from, to);
      if (!path || path.length === 0) {
        return [];
      }

      return path.map((nodeId: string) => graph.nodes[nodeId]).filter(Boolean);
    } catch {
      // Path not found
      return [];
    }
  }

  /**
   * Traverse graph from a starting node using BFS
   */
  async traverse(
    uid: string,
    graphId: string,
    startNodeId: string,
    options: TraverseOptions = {}
  ): Promise<TraverseResult> {
    const graph = await this.loader.getGraph(uid, graphId);
    const graphologyGraph = await this.loader.getGraphologyGraph(uid, graphId);

    if (!graph.nodes[startNodeId]) {
      throw new Error(`Start node ${startNodeId} not found`);
    }

    const {
      relationshipTypes,
      direction = 'outgoing',
      maxDepth = 10,
      limit = 100,
      filter,
    } = options;

    const visited = new Set<string>([startNodeId]);
    const resultNodes: GraphNode[] = [graph.nodes[startNodeId]];
    const resultRelationships: Relationship[] = [];
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

    while (queue.length > 0 && resultNodes.length < limit) {
      const { nodeId, depth } = queue.shift()!;

      if (depth >= maxDepth) {
        continue;
      }

      // Get neighbors based on direction
      const neighbors: string[] = [];
      if (direction === 'outgoing' || direction === 'both') {
        graphologyGraph.forEachOutNeighbor(nodeId, (neighborId: string) => {
          neighbors.push(neighborId);
        });
      }
      if (direction === 'incoming' || direction === 'both') {
        graphologyGraph.forEachInNeighbor(nodeId, (neighborId: string) => {
          neighbors.push(neighborId);
        });
      }

      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) {
          continue;
        }

        const neighborNode = graph.nodes[neighborId];
        if (!neighborNode) {
          continue;
        }

        // Apply filter if provided
        if (filter && !filter(neighborNode)) {
          continue;
        }

        // Check relationship type filter
        if (relationshipTypes) {
          const rel = graph.relationships.find(
            r =>
              (r.source === nodeId && r.target === neighborId) ||
              (r.source === neighborId && r.target === nodeId)
          );
          if (!rel || !relationshipTypes.includes(rel.type)) {
            continue;
          }
        }

        visited.add(neighborId);
        resultNodes.push(neighborNode);
        queue.push({ nodeId: neighborId, depth: depth + 1 });

        // Add relationship
        const rel = graph.relationships.find(
          r =>
            (r.source === nodeId && r.target === neighborId) ||
            (r.source === neighborId && r.target === nodeId)
        );
        if (rel) {
          resultRelationships.push(rel);
        }
      }
    }

    return {
      nodes: resultNodes,
      relationships: resultRelationships,
      depth: maxDepth,
      visited: Array.from(visited),
    };
  }

  /**
   * Extract a subgraph containing specified nodes and their neighbors within depth
   */
  async extractSubgraph(
    uid: string,
    graphId: string,
    nodeIds: string[],
    depth?: number
  ): Promise<NodeBasedKnowledgeGraph> {
    const graph = await this.loader.getGraph(uid, graphId);
    const graphologyGraph = await this.loader.getGraphologyGraph(uid, graphId);

    const includedNodes = new Set<string>(nodeIds);
    const includedRelationships: Relationship[] = [];

    // Expand to include nodes within depth
    if (depth !== undefined && depth > 0) {
      const queue = [...nodeIds];
      const visited = new Set<string>(nodeIds);
      let currentDepth = 0;
      let nodesAtCurrentDepth = nodeIds.length;

      while (queue.length > 0 && currentDepth < depth) {
        const nodeId = queue.shift()!;
        nodesAtCurrentDepth--;

        graphologyGraph.forEachNeighbor(nodeId, (neighborId: string) => {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            includedNodes.add(neighborId);
            queue.push(neighborId);
          }
        });

        if (nodesAtCurrentDepth === 0) {
          currentDepth++;
          nodesAtCurrentDepth = queue.length;
        }
      }
    }

    // Extract nodes and relationships
    const subgraphNodes: Record<string, GraphNode> = {};
    const subgraphNodeTypes: NodeBasedKnowledgeGraph['nodeTypes'] = {
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

    for (const nodeId of includedNodes) {
      const node = graph.nodes[nodeId];
      if (node) {
        subgraphNodes[nodeId] = node;
        const typeArray = subgraphNodeTypes[node.type];
        if (typeArray) {
          typeArray.push(nodeId);
        }
      }
    }

    // Extract relationships between included nodes
    for (const rel of graph.relationships) {
      if (includedNodes.has(rel.source) && includedNodes.has(rel.target)) {
        includedRelationships.push(rel);
      }
    }

    return {
      ...graph,
      nodes: subgraphNodes,
      nodeTypes: subgraphNodeTypes,
      relationships: includedRelationships,
      updatedAt: Date.now(),
    };
  }

  /**
   * Get all descendants of a node
   */
  async getDescendants(
    uid: string,
    graphId: string,
    nodeId: string,
    maxDepth?: number
  ): Promise<GraphNode[]> {
    const result = await this.traverse(uid, graphId, nodeId, {
      direction: 'outgoing',
      maxDepth: maxDepth ?? 100,
    });
    // Remove the starting node
    return result.nodes.slice(1);
  }

  /**
   * Get all ancestors of a node
   */
  async getAncestors(
    uid: string,
    graphId: string,
    nodeId: string,
    maxDepth?: number
  ): Promise<GraphNode[]> {
    const result = await this.traverse(uid, graphId, nodeId, {
      direction: 'incoming',
      maxDepth: maxDepth ?? 100,
    });
    // Remove the starting node
    return result.nodes.slice(1);
  }
}
