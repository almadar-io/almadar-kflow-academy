/**
 * Relationship Mutation Service
 * 
 * Handles create, update, and delete operations for graph relationships.
 */

import type { GraphLoader } from '../core/GraphLoader';
import type { Relationship, RelationshipType } from '../../../types/nodeBasedKnowledgeGraph';

export class RelationshipMutationService {
  constructor(private loader: GraphLoader) {}

  /**
   * Create a new relationship
   */
  async createRelationship(
    uid: string,
    graphId: string,
    relationship: Relationship
  ): Promise<Relationship> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;

    // Validate nodes exist
    if (!graph.nodes[relationship.source] || !graph.nodes[relationship.target]) {
      throw new Error('Source or target node does not exist');
    }

    // Check for duplicate
    const existing = graph.relationships.find(
      rel =>
        rel.source === relationship.source &&
        rel.target === relationship.target &&
        rel.type === relationship.type
    );

    if (existing) {
      return existing; // Return existing relationship
    }

    graph.relationships.push(relationship);
    graph.updatedAt = Date.now();

    await this.loader.saveGraph(uid, graph, expectedVersion);
    return relationship;
  }

  /**
   * Update a relationship
   */
  async updateRelationship(
    uid: string,
    graphId: string,
    relId: string,
    updates: Partial<Omit<Relationship, 'id' | 'source' | 'target' | 'type'>>
  ): Promise<Relationship> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const index = graph.relationships.findIndex(rel => rel.id === relId);

    if (index === -1) {
      throw new Error(`Relationship ${relId} not found`);
    }

    const updatedRelationship: Relationship = {
      ...graph.relationships[index],
      ...updates,
    };

    graph.relationships[index] = updatedRelationship;
    graph.updatedAt = Date.now();

    await this.loader.saveGraph(uid, graph, expectedVersion);
    return updatedRelationship;
  }

  /**
   * Delete a relationship by ID
   */
  async deleteRelationship(uid: string, graphId: string, relId: string): Promise<void> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const index = graph.relationships.findIndex(rel => rel.id === relId);

    if (index === -1) {
      throw new Error(`Relationship ${relId} not found`);
    }

    graph.relationships.splice(index, 1);
    graph.updatedAt = Date.now();

    await this.loader.saveGraph(uid, graph, expectedVersion);
  }

  /**
   * Delete relationships by source, target, and optional type
   */
  async deleteRelationshipsBetween(
    uid: string,
    graphId: string,
    sourceId: string,
    targetId: string,
    type?: RelationshipType
  ): Promise<number> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const initialCount = graph.relationships.length;

    graph.relationships = graph.relationships.filter(rel => {
      const matches =
        rel.source === sourceId &&
        rel.target === targetId &&
        (type === undefined || rel.type === type);
      return !matches;
    });

    const deletedCount = initialCount - graph.relationships.length;

    if (deletedCount > 0) {
      graph.updatedAt = Date.now();
      await this.loader.saveGraph(uid, graph, expectedVersion);
    }

    return deletedCount;
  }

  /**
   * Delete all relationships of a specific type
   */
  async deleteRelationshipsByType(
    uid: string,
    graphId: string,
    type: RelationshipType
  ): Promise<number> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const initialCount = graph.relationships.length;

    graph.relationships = graph.relationships.filter(rel => rel.type !== type);

    const deletedCount = initialCount - graph.relationships.length;

    if (deletedCount > 0) {
      graph.updatedAt = Date.now();
      await this.loader.saveGraph(uid, graph, expectedVersion);
    }

    return deletedCount;
  }

  /**
   * Delete multiple relationships by IDs
   */
  async deleteRelationships(uid: string, graphId: string, relIds: string[]): Promise<void> {
    const graph = await this.loader.getGraph(uid, graphId);
    const expectedVersion = graph.version;
    const idSet = new Set(relIds);

    graph.relationships = graph.relationships.filter(rel => !idSet.has(rel.id));
    graph.updatedAt = Date.now();

    await this.loader.saveGraph(uid, graph, expectedVersion);
  }
}
