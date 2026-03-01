/**
 * Node Mutation Service
 * 
 * Handles create, update, and delete operations for graph nodes.
 */

import type { GraphLoader } from '../core/GraphLoader';
import type { GraphNode } from '../../../types/nodeBasedKnowledgeGraph';

export interface DeleteNodeOptions {
  cascade?: boolean; // Delete related nodes as well
}

export class NodeMutationService {
  constructor(private loader: GraphLoader) {}

  /**
   * Create a new node
   */
  async createNode(
    uid: string,
    graphId: string,
    node: GraphNode
  ): Promise<GraphNode> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;

    if (graph.nodes[node.id]) {
      throw new Error(`Node ${node.id} already exists`);
    }

    // Initialize node type array if needed
    if (!graph.nodeTypes[node.type]) {
      (graph.nodeTypes as unknown as Record<string, string[]>)[node.type] = [];
    }

    graph.nodes[node.id] = node;
    const typeArray = graph.nodeTypes[node.type];
    if (typeArray) {
      typeArray.push(node.id);
    }
    graph.updatedAt = Date.now();

    await this.loader.saveGraph(uid, graph, expectedVersion);
    return node;
  }

  /**
   * Update a node
   */
  async updateNode(
    uid: string,
    graphId: string,
    nodeId: string,
    updates: Partial<GraphNode>
  ): Promise<GraphNode> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const node = graph.nodes[nodeId];

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const updatedNode: GraphNode = {
      ...node,
      ...updates,
      properties: { ...node.properties, ...updates.properties },
      updatedAt: Date.now(),
    };

    graph.nodes[nodeId] = updatedNode;
    graph.updatedAt = Date.now();

    await this.loader.saveGraph(uid, graph, expectedVersion);
    return updatedNode;
  }

  /**
   * Update only the properties of a node
   */
  async updateNodeProperties(
    uid: string,
    graphId: string,
    nodeId: string,
    properties: Record<string, any>
  ): Promise<GraphNode> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const node = graph.nodes[nodeId];

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const updatedNode: GraphNode = {
      ...node,
      properties: { ...node.properties, ...properties },
      updatedAt: Date.now(),
    };

    graph.nodes[nodeId] = updatedNode;
    graph.updatedAt = Date.now();

    await this.loader.saveGraph(uid, graph, expectedVersion);
    return updatedNode;
  }

  /**
   * Delete a node and its relationships
   */
  async deleteNode(
    uid: string,
    graphId: string,
    nodeId: string,
    options: DeleteNodeOptions = {}
  ): Promise<void> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const node = graph.nodes[nodeId];

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Remove from nodes
    delete graph.nodes[nodeId];

    // Remove from type index
    const typeIndex = graph.nodeTypes[node.type];
    if (typeIndex) {
      const index = typeIndex.indexOf(nodeId);
      if (index > -1) {
        typeIndex.splice(index, 1);
      }
    }

    // Remove relationships involving this node
    graph.relationships = graph.relationships.filter(
      rel => rel.source !== nodeId && rel.target !== nodeId
    );

    graph.updatedAt = Date.now();
    await this.loader.saveGraph(uid, graph, expectedVersion);
  }

  /**
   * Delete multiple nodes
   */
  async deleteNodes(
    uid: string,
    graphId: string,
    nodeIds: string[]
  ): Promise<void> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const nodeIdSet = new Set(nodeIds);

    for (const nodeId of nodeIds) {
      const node = graph.nodes[nodeId];
      if (!node) continue;

      // Remove from nodes
      delete graph.nodes[nodeId];

      // Remove from type index
      const typeIndex = graph.nodeTypes[node.type];
      if (typeIndex) {
        const index = typeIndex.indexOf(nodeId);
        if (index > -1) {
          typeIndex.splice(index, 1);
        }
      }
    }

    // Remove relationships involving any of the deleted nodes
    graph.relationships = graph.relationships.filter(
      rel => !nodeIdSet.has(rel.source) && !nodeIdSet.has(rel.target)
    );

    graph.updatedAt = Date.now();
    await this.loader.saveGraph(uid, graph, expectedVersion);
  }
}
