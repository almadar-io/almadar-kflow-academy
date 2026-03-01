/**
 * Relationship Query Service
 * 
 * Handles read operations for graph relationships.
 */

import type { GraphLoader } from '../core/GraphLoader';
import type { Relationship, RelationshipType } from '../../../types/nodeBasedKnowledgeGraph';

export interface RelationshipQueryOptions {
  direction?: 'incoming' | 'outgoing' | 'both';
  types?: RelationshipType[];
}

export class RelationshipQueryService {
  constructor(private loader: GraphLoader) {}

  /**
   * Get a single relationship by ID
   */
  async getRelationship(uid: string, graphId: string, relId: string): Promise<Relationship | null> {
    const graph = await this.loader.getGraph(uid, graphId);
    return graph.relationships.find(rel => rel.id === relId) || null;
  }

  /**
   * Get multiple relationships by IDs
   */
  async getRelationships(uid: string, graphId: string, relIds: string[]): Promise<Relationship[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    const idSet = new Set(relIds);
    return graph.relationships.filter(rel => idSet.has(rel.id));
  }

  /**
   * Get all relationships (optionally filtered by node and direction)
   */
  async getAllRelationships(
    uid: string,
    graphId: string,
    nodeId?: string,
    direction?: 'incoming' | 'outgoing' | 'both'
  ): Promise<Relationship[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    let relationships = graph.relationships;

    if (nodeId) {
      if (direction === 'incoming') {
        relationships = relationships.filter(rel => rel.target === nodeId);
      } else if (direction === 'outgoing') {
        relationships = relationships.filter(rel => rel.source === nodeId);
      } else {
        // 'both' or undefined - return all relationships involving the node
        relationships = relationships.filter(
          rel => rel.source === nodeId || rel.target === nodeId
        );
      }
    }

    return relationships;
  }

  /**
   * Get relationships by type
   */
  async getRelationshipsByType(
    uid: string,
    graphId: string,
    type: RelationshipType,
    nodeId?: string
  ): Promise<Relationship[]> {
    const relationships = await this.getAllRelationships(uid, graphId, nodeId);
    return relationships.filter(rel => rel.type === type);
  }

  /**
   * Get relationships for a node with options
   */
  async getNodeRelationships(
    uid: string,
    graphId: string,
    nodeId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<Relationship[]> {
    const { direction = 'both', types } = options;
    let relationships = await this.getAllRelationships(uid, graphId, nodeId, direction);

    if (types && types.length > 0) {
      const typeSet = new Set(types);
      relationships = relationships.filter(rel => typeSet.has(rel.type));
    }

    return relationships;
  }

  /**
   * Find relationships matching a predicate
   */
  async findRelationships(
    uid: string,
    graphId: string,
    predicate: (rel: Relationship) => boolean
  ): Promise<Relationship[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    return graph.relationships.filter(predicate);
  }

  /**
   * Check if a relationship exists between two nodes
   */
  async relationshipExists(
    uid: string,
    graphId: string,
    sourceId: string,
    targetId: string,
    type?: RelationshipType
  ): Promise<boolean> {
    const graph = await this.loader.getGraph(uid, graphId);
    return graph.relationships.some(
      rel =>
        rel.source === sourceId &&
        rel.target === targetId &&
        (type === undefined || rel.type === type)
    );
  }

  /**
   * Get connected node IDs from a node
   */
  async getConnectedNodeIds(
    uid: string,
    graphId: string,
    nodeId: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both'
  ): Promise<string[]> {
    const relationships = await this.getAllRelationships(uid, graphId, nodeId, direction);
    const nodeIds = new Set<string>();

    for (const rel of relationships) {
      if (rel.source === nodeId) {
        nodeIds.add(rel.target);
      }
      if (rel.target === nodeId) {
        nodeIds.add(rel.source);
      }
    }

    return Array.from(nodeIds);
  }
}
