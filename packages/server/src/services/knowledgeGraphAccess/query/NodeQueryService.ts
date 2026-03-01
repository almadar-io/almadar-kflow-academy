/**
 * Node Query Service
 * 
 * Handles read operations for graph nodes.
 */

import type { GraphLoader } from '../core/GraphLoader';
import type { GraphNode, NodeType } from '../../../types/nodeBasedKnowledgeGraph';

export class NodeQueryService {
  constructor(private loader: GraphLoader) {}

  /**
   * Get a single node by ID
   */
  async getNode(uid: string, graphId: string, nodeId: string): Promise<GraphNode | null> {
    const graph = await this.loader.getGraph(uid, graphId);
    return graph.nodes[nodeId] || null;
  }

  /**
   * Get multiple nodes by IDs
   */
  async getNodes(uid: string, graphId: string, nodeIds: string[]): Promise<GraphNode[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    return nodeIds.map(id => graph.nodes[id]).filter(Boolean);
  }

  /**
   * Get all nodes of a specific type
   */
  async getNodesByType(uid: string, graphId: string, type: NodeType): Promise<GraphNode[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    const nodeIds = graph.nodeTypes[type] || [];
    return nodeIds.map(id => graph.nodes[id]).filter(Boolean);
  }

  /**
   * Find nodes matching a predicate
   */
  async findNodes(
    uid: string,
    graphId: string,
    predicate: (node: GraphNode) => boolean
  ): Promise<GraphNode[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    return Object.values(graph.nodes).filter(predicate);
  }

  /**
   * Get node count by type
   */
  async getNodeCountByType(uid: string, graphId: string, type: NodeType): Promise<number> {
    const graph = await this.loader.getGraph(uid, graphId);
    return (graph.nodeTypes[type] || []).length;
  }

  /**
   * Get all node IDs of a specific type
   */
  async getNodeIdsByType(uid: string, graphId: string, type: NodeType): Promise<string[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    return graph.nodeTypes[type] || [];
  }

  /**
   * Check if a node exists
   */
  async nodeExists(uid: string, graphId: string, nodeId: string): Promise<boolean> {
    const graph = await this.loader.getGraph(uid, graphId);
    return nodeId in graph.nodes;
  }

  /**
   * Get seed concept node
   */
  async getSeedConcept(uid: string, graphId: string): Promise<GraphNode | null> {
    const graph = await this.loader.getGraph(uid, graphId);
    return graph.nodes[graph.seedConceptId] || null;
  }
}
