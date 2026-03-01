/**
 * Knowledge Graph Access Layer
 * 
 * Facade that provides a unified interface for querying and mutating NodeBasedKnowledgeGraph.
 * Delegates to specialized services for different operations.
 */

import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
} from '../../types/nodeBasedKnowledgeGraph';

// Core services
import { GraphCacheManager } from './core/GraphCacheManager';
import { GraphLoader } from './core/GraphLoader';

// Query services
import { NodeQueryService } from './query/NodeQueryService';
import { RelationshipQueryService } from './query/RelationshipQueryService';
import { GraphAlgorithmService, type TraverseOptions, type TraverseResult } from './query/GraphAlgorithmService';

// Mutation services
import { NodeMutationService } from './mutation/NodeMutationService';
import { RelationshipMutationService } from './mutation/RelationshipMutationService';

// Publishing services
import {
  PublishingQueryService,
  type SeedConceptPublishData,
  type ModuleConceptPublishData,
  type LessonContentPublishData,
  type GraphMetadataPublishData,
  type ConceptsByLayer,
} from './publishing/PublishingQueryService';

import {
  CoursePublishingService,
  type CoursePublishSettings,
  type PublishedCourseView,
} from './publishing/CoursePublishingService';

import {
  ModulePublishingService,
  type ModulePublishSettings,
  type PublishedModuleView,
} from './publishing/ModulePublishingService';

import {
  LessonPublishingService,
  type LessonPublishSettings,
  type PublishedLessonView,
} from './publishing/LessonPublishingService';

import type { CourseSettingsNodeProperties, ModuleSettingsNodeProperties, LessonSettingsNodeProperties } from '../../types/nodeBasedKnowledgeGraph';

// Re-export types
export type { TraverseOptions, TraverseResult };
export type { CoursePublishSettings, PublishedCourseView };
export type { ModulePublishSettings, PublishedModuleView };
export type { LessonPublishSettings, PublishedLessonView };

/**
 * Knowledge Graph Access Layer - Facade
 * 
 * Composes specialized services and provides a unified API.
 * Maintains backward compatibility with existing code.
 */
export class KnowledgeGraphAccessLayer {
  // Core services
  private cacheManager: GraphCacheManager;
  private loader: GraphLoader;

  // Query services
  private nodeQuery: NodeQueryService;
  private relQuery: RelationshipQueryService;
  private algorithms: GraphAlgorithmService;

  // Mutation services
  private nodeMutation: NodeMutationService;
  private relMutation: RelationshipMutationService;

  // Publishing services
  private publishingQuery: PublishingQueryService;
  private coursePublishing: CoursePublishingService;
  private modulePublishing: ModulePublishingService;
  private lessonPublishing: LessonPublishingService;

  constructor() {
    // Initialize core services
    this.cacheManager = new GraphCacheManager();
    this.loader = new GraphLoader(this.cacheManager);

    // Initialize query services
    this.nodeQuery = new NodeQueryService(this.loader);
    this.relQuery = new RelationshipQueryService(this.loader);
    this.algorithms = new GraphAlgorithmService(this.loader);

    // Initialize mutation services
    this.nodeMutation = new NodeMutationService(this.loader);
    this.relMutation = new RelationshipMutationService(this.loader);

    // Initialize publishing services
    this.publishingQuery = new PublishingQueryService(this.loader);
    this.coursePublishing = new CoursePublishingService(
      this.loader,
      this.nodeMutation,
      this.relMutation,
      this.publishingQuery
    );
    this.modulePublishing = new ModulePublishingService(
      this.loader,
      this.nodeMutation,
      this.relMutation,
      this.publishingQuery,
      this.coursePublishing
    );
    this.lessonPublishing = new LessonPublishingService(
      this.loader,
      this.nodeMutation,
      this.relMutation,
      this.publishingQuery,
      this.coursePublishing
    );
  }

  // ==================== Graph Operations ====================

  /**
   * Get full graph
   */
  async getGraph(uid: string, graphId: string): Promise<NodeBasedKnowledgeGraph> {
    return this.loader.getGraph(uid, graphId);
  }

  /**
   * Save graph with optional version checking for optimistic locking
   */
  async saveGraph(
    uid: string,
    graph: NodeBasedKnowledgeGraph,
    expectedVersion?: number
  ): Promise<NodeBasedKnowledgeGraph> {
    return this.loader.saveGraph(uid, graph, expectedVersion);
  }

  /**
   * Delete graph
   */
  async deleteGraph(uid: string, graphId: string): Promise<void> {
    return this.loader.deleteGraph(uid, graphId);
  }

  // ==================== Node Queries ====================

  /**
   * Get a single node
   */
  async getNode(uid: string, graphId: string, nodeId: string): Promise<GraphNode | null> {
    return this.nodeQuery.getNode(uid, graphId, nodeId);
  }

  /**
   * Get all nodes of a specific type
   */
  async getNodesByType(uid: string, graphId: string, type: NodeType): Promise<GraphNode[]> {
    return this.nodeQuery.getNodesByType(uid, graphId, type);
  }

  /**
   * Find nodes matching a predicate
   */
  async findNodes(
    uid: string,
    graphId: string,
    predicate: (node: GraphNode) => boolean
  ): Promise<GraphNode[]> {
    return this.nodeQuery.findNodes(uid, graphId, predicate);
  }

  // ==================== Node Mutations ====================

  /**
   * Create a new node
   */
  async createNode(uid: string, graphId: string, node: GraphNode): Promise<GraphNode> {
    return this.nodeMutation.createNode(uid, graphId, node);
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
    return this.nodeMutation.updateNode(uid, graphId, nodeId, updates);
  }

  /**
   * Delete a node
   */
  async deleteNode(
    uid: string,
    graphId: string,
    nodeId: string,
    options: { cascade?: boolean } = {}
  ): Promise<void> {
    return this.nodeMutation.deleteNode(uid, graphId, nodeId, options);
  }

  // ==================== Relationship Queries ====================

  /**
   * Get relationships
   */
  async getRelationships(
    uid: string,
    graphId: string,
    nodeId?: string,
    direction?: 'incoming' | 'outgoing' | 'both'
  ): Promise<Relationship[]> {
    return this.relQuery.getAllRelationships(uid, graphId, nodeId, direction);
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
    return this.relQuery.getRelationshipsByType(uid, graphId, type, nodeId);
  }

  // ==================== Relationship Mutations ====================

  /**
   * Create a relationship
   */
  async createRelationship(
    uid: string,
    graphId: string,
    relationship: Relationship
  ): Promise<Relationship> {
    return this.relMutation.createRelationship(uid, graphId, relationship);
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(uid: string, graphId: string, relId: string): Promise<void> {
    return this.relMutation.deleteRelationship(uid, graphId, relId);
  }

  // ==================== Graph Algorithms ====================

  /**
   * Find path between two nodes
   * @param maxDepth - Optional maximum path length (reserved for future use)
   */
  async findPath(
    uid: string,
    graphId: string,
    from: string,
    to: string,
    maxDepth?: number
  ): Promise<GraphNode[]> {
    return this.algorithms.findPath(uid, graphId, from, to, maxDepth);
  }

  /**
   * Traverse graph from a starting node
   */
  async traverse(
    uid: string,
    graphId: string,
    startNodeId: string,
    options: TraverseOptions = {}
  ): Promise<TraverseResult> {
    return this.algorithms.traverse(uid, graphId, startNodeId, options);
  }

  /**
   * Extract subgraph
   */
  async extractSubgraph(
    uid: string,
    graphId: string,
    nodeIds: string[],
    depth?: number
  ): Promise<NodeBasedKnowledgeGraph> {
    return this.algorithms.extractSubgraph(uid, graphId, nodeIds, depth);
  }

  // ==================== Cache Operations ====================

  /**
   * Clear cache for a graph
   */
  clearCache(uid: string, graphId: string): void {
    this.cacheManager.invalidateCache(uid, graphId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cacheManager.clearAllCache();
  }

  // ==================== Publishing Query Methods ====================

  /**
   * Get seed concept with layers as modules for course publishing
   */
  async getSeedConceptForPublishing(
    uid: string,
    graphId: string
  ): Promise<SeedConceptPublishData | null> {
    return this.publishingQuery.getSeedConceptForPublishing(uid, graphId);
  }

  /**
   * Get layer with its concepts as lessons for publishing
   */
  async getModuleConceptForPublishing(
    uid: string,
    graphId: string,
    moduleId: string
  ): Promise<ModuleConceptPublishData | null> {
    return this.publishingQuery.getModuleConceptForPublishing(uid, graphId, moduleId);
  }

  /**
   * Get lesson content for publishing
   */
  async getLessonContentForPublishing(
    uid: string,
    graphId: string,
    conceptId: string
  ): Promise<LessonContentPublishData | null> {
    return this.publishingQuery.getLessonContentForPublishing(uid, graphId, conceptId);
  }

  /**
   * Get all concepts organized by layer for bulk publishing
   */
  async getConceptsByLayerForPublishing(
    uid: string,
    graphId: string
  ): Promise<Map<number, ConceptsByLayer[]>> {
    return this.publishingQuery.getConceptsByLayerForPublishing(uid, graphId);
  }

  /**
   * Get graph metadata for publishing
   */
  async getGraphMetadataForPublishing(
    uid: string,
    graphId: string
  ): Promise<GraphMetadataPublishData | null> {
    return this.publishingQuery.getGraphMetadataForPublishing(uid, graphId);
  }

  // ==================== Course Publishing Methods ====================

  /**
   * Publish a course
   */
  async publishCourse(
    uid: string,
    graphId: string,
    settings: CoursePublishSettings
  ): Promise<{ courseSettingsId: string }> {
    return this.coursePublishing.publishCourse(uid, graphId, settings);
  }

  /**
   * Unpublish a course
   */
  async unpublishCourse(uid: string, graphId: string): Promise<void> {
    return this.coursePublishing.unpublishCourse(uid, graphId);
  }

  /**
   * Update course settings
   */
  async updateCourseSettings(
    uid: string,
    graphId: string,
    updates: Partial<CoursePublishSettings>
  ): Promise<void> {
    return this.coursePublishing.updateCourseSettings(uid, graphId, updates);
  }

  /**
   * Get course settings
   */
  async getCourseSettings(
    uid: string,
    graphId: string
  ): Promise<CourseSettingsNodeProperties | null> {
    return this.coursePublishing.getCourseSettings(uid, graphId);
  }

  /**
   * Get published course view for students
   */
  async getPublishedCourseView(
    mentorId: string,
    graphId: string,
    studentLanguage?: string
  ): Promise<PublishedCourseView | null> {
    return this.coursePublishing.getPublishedCourseView(mentorId, graphId, studentLanguage);
  }

  /**
   * Check if course is published
   */
  async isCoursePublished(uid: string, graphId: string): Promise<boolean> {
    return this.coursePublishing.isCoursePublished(uid, graphId);
  }

  // ==================== Module Publishing Methods ====================

  /**
   * Publish a module (layer)
   */
  async publishModule(
    uid: string,
    graphId: string,
    layerId: string,
    settings?: ModulePublishSettings
  ): Promise<{ moduleSettingsId: string }> {
    return this.modulePublishing.publishModule(uid, graphId, layerId, settings);
  }

  /**
   * Unpublish a module
   */
  async unpublishModule(uid: string, graphId: string, layerId: string): Promise<void> {
    return this.modulePublishing.unpublishModule(uid, graphId, layerId);
  }

  /**
   * Update module settings
   */
  async updateModuleSettings(
    uid: string,
    graphId: string,
    layerId: string,
    updates: Partial<ModulePublishSettings>
  ): Promise<void> {
    return this.modulePublishing.updateModuleSettings(uid, graphId, layerId, updates);
  }

  /**
   * Get module settings
   */
  async getModuleSettings(
    uid: string,
    graphId: string,
    layerId: string
  ): Promise<ModuleSettingsNodeProperties | null> {
    return this.modulePublishing.getModuleSettings(uid, graphId, layerId);
  }

  /**
   * Get published modules for a course
   */
  async getPublishedModules(uid: string, graphId: string): Promise<PublishedModuleView[]> {
    return this.modulePublishing.getPublishedModules(uid, graphId);
  }

  /**
   * Publish all modules at once
   */
  async publishAllModules(
    uid: string,
    graphId: string,
    settings?: ModulePublishSettings
  ): Promise<{ publishedCount: number; moduleSettingsIds: string[] }> {
    return this.modulePublishing.publishAllModules(uid, graphId, settings);
  }

  // ==================== Lesson Publishing Methods ====================

  /**
   * Publish a lesson (concept)
   */
  async publishLesson(
    uid: string,
    graphId: string,
    conceptId: string,
    settings?: LessonPublishSettings
  ): Promise<{ lessonSettingsId: string }> {
    return this.lessonPublishing.publishLesson(uid, graphId, conceptId, settings);
  }

  /**
   * Unpublish a lesson
   */
  async unpublishLesson(uid: string, graphId: string, conceptId: string): Promise<void> {
    return this.lessonPublishing.unpublishLesson(uid, graphId, conceptId);
  }

  /**
   * Update lesson settings
   */
  async updateLessonSettings(
    uid: string,
    graphId: string,
    conceptId: string,
    updates: Partial<LessonPublishSettings>
  ): Promise<void> {
    return this.lessonPublishing.updateLessonSettings(uid, graphId, conceptId, updates);
  }

  /**
   * Get lesson settings
   */
  async getLessonSettings(
    uid: string,
    graphId: string,
    conceptId: string
  ): Promise<LessonSettingsNodeProperties | null> {
    return this.lessonPublishing.getLessonSettings(uid, graphId, conceptId);
  }

  /**
   * Get published lessons for a module
   */
  async getPublishedLessons(
    uid: string,
    graphId: string,
    layerId: string
  ): Promise<PublishedLessonView[]> {
    return this.lessonPublishing.getPublishedLessons(uid, graphId, layerId);
  }

  /**
   * Publish all lessons in a module
   */
  async publishAllLessonsInModule(
    uid: string,
    graphId: string,
    layerId: string,
    settings?: LessonPublishSettings
  ): Promise<{ publishedCount: number; lessonSettingsIds: string[] }> {
    return this.lessonPublishing.publishAllLessonsInModule(uid, graphId, layerId, settings);
  }

  /**
   * Get all published lessons in a course
   */
  async getAllPublishedLessons(uid: string, graphId: string): Promise<PublishedLessonView[]> {
    return this.lessonPublishing.getAllPublishedLessons(uid, graphId);
  }

  // ==================== Service Accessors (for advanced usage) ====================

  /**
   * Get the cache manager for advanced cache operations
   */
  getCacheManager(): GraphCacheManager {
    return this.cacheManager;
  }

  /**
   * Get the graph loader for direct graph operations
   */
  getLoader(): GraphLoader {
    return this.loader;
  }

  /**
   * Get the node query service
   */
  getNodeQueryService(): NodeQueryService {
    return this.nodeQuery;
  }

  /**
   * Get the relationship query service
   */
  getRelationshipQueryService(): RelationshipQueryService {
    return this.relQuery;
  }

  /**
   * Get the graph algorithm service
   */
  getAlgorithmService(): GraphAlgorithmService {
    return this.algorithms;
  }

  /**
   * Get the node mutation service
   */
  getNodeMutationService(): NodeMutationService {
    return this.nodeMutation;
  }

  /**
   * Get the relationship mutation service
   */
  getRelationshipMutationService(): RelationshipMutationService {
    return this.relMutation;
  }

  /**
   * Get the publishing query service
   */
  getPublishingQueryService(): PublishingQueryService {
    return this.publishingQuery;
  }

  /**
   * Get the course publishing service
   */
  getCoursePublishingService(): CoursePublishingService {
    return this.coursePublishing;
  }

  /**
   * Get the module publishing service
   */
  getModulePublishingService(): ModulePublishingService {
    return this.modulePublishing;
  }

  /**
   * Get the lesson publishing service
   */
  getLessonPublishingService(): LessonPublishingService {
    return this.lessonPublishing;
  }
}
