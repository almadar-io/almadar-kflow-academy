/**
 * Module Publishing Service
 * 
 * Handles module-level (layer) publishing operations:
 * - Publish/unpublish modules (creates/removes ModuleSettings nodes)
 * - Update module settings
 * - Get published modules for a course
 */

import type { GraphLoader } from '../core/GraphLoader';
import type { NodeMutationService } from '../mutation/NodeMutationService';
import type { RelationshipMutationService } from '../mutation/RelationshipMutationService';
import type { PublishingQueryService, ModuleConceptPublishData, SeedConceptPublishData } from './PublishingQueryService';
import {
  createModuleSettingsNode,
  createPublishingRelationship,
  type ModuleSettingsNodeProperties,
} from '../../../types/nodeBasedKnowledgeGraph';

/**
 * Input settings for publishing a module
 */
export interface ModulePublishSettings {
  title?: string;
  description?: string;
  sequence?: number;
  estimatedDuration?: number;
  isPreviewable?: boolean;
}

/**
 * Published module view for students
 */
export interface PublishedModuleView {
  moduleSettingsId: string;
  layerId: string;
  title: string;
  description: string;
  layerNumber: number;
  goal?: string;
  sequence: number;
  isPublished: boolean;
  publishedAt?: number;
  estimatedDuration?: number;
  isPreviewable: boolean;
  lessonCount: number;
  publishedLessonCount: number;
}

import type { CoursePublishingService } from './CoursePublishingService';

export class ModulePublishingService {
  constructor(
    private loader: GraphLoader,
    private nodeMutation: NodeMutationService,
    private relMutation: RelationshipMutationService,
    private publishingQuery: PublishingQueryService,
    private coursePublishing: CoursePublishingService
  ) {}

  /**
   * Publish a module - creates a ModuleSettings node in the graph
   * @param layerId - The Layer node ID to publish as a module
   */
  async publishModule(
    uid: string,
    graphId: string,
    layerId: string,
    settings?: ModulePublishSettings
  ): Promise<{ moduleSettingsId: string }> {
    const graph = await this.loader.getGraph(uid, graphId);
    
    // Ensure CourseSettings exists - auto-create if missing
    // This ensures the course appears in MentorPage even if lessons/modules are published first
    await this.coursePublishing.ensureCourseSettingsExists(uid, graphId);
    
    // Verify the layer exists
    const layerNode = graph.nodes[layerId];
    if (!layerNode || layerNode.type !== 'Layer') {
      throw new Error(`Layer ${layerId} not found`);
    }

    // Check if already published
    const existingSettingsId = `module-settings-${layerId}`;
    if (graph.nodes[existingSettingsId]) {
      // Update instead
      await this.updateModuleSettings(uid, graphId, layerId, settings || {});
      return { moduleSettingsId: existingSettingsId };
    }

    const layerNumber = layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;

    // Create ModuleSettings node
    const moduleSettingsNode = createModuleSettingsNode(layerId, {
      title: settings?.title || layerNode.properties?.name || `Module ${layerNumber}`,
      description: settings?.description || layerNode.properties?.description || layerNode.properties?.goal || '',
      isPublished: true,
      publishedAt: Date.now(),
      sequence: settings?.sequence ?? layerNumber,
      estimatedDuration: settings?.estimatedDuration,
      isPreviewable: settings?.isPreviewable ?? false,
    });

    // Add the node to the graph
    await this.nodeMutation.createNode(uid, graphId, moduleSettingsNode);

    // Create relationship from Layer node to ModuleSettings
    const layerToSettingsRel = createPublishingRelationship(
      layerId,
      moduleSettingsNode.id,
      'hasModuleSettings'
    );
    await this.relMutation.createRelationship(uid, graphId, layerToSettingsRel);

    // Create relationship from CourseSettings to ModuleSettings (for course structure traversal)
    // Reload graph to get latest state after creating the node
    const updatedGraph = await this.loader.getGraph(uid, graphId);
    const courseSettingsId = `course-settings-${graphId}`;
    if (updatedGraph.nodes[courseSettingsId]) {
      const courseToModuleRel = createPublishingRelationship(
        courseSettingsId,
        moduleSettingsNode.id,
        'hasModuleSettings'
      );
      await this.relMutation.createRelationship(uid, graphId, courseToModuleRel);
    }

    return { moduleSettingsId: moduleSettingsNode.id };
  }

  /**
   * Unpublish a module - marks ModuleSettings as unpublished
   */
  async unpublishModule(uid: string, graphId: string, layerId: string): Promise<void> {
    const settingsId = `module-settings-${layerId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    if (!graph.nodes[settingsId]) {
      throw new Error('Module is not published');
    }

    // Update to unpublished state
    await this.nodeMutation.updateNodeProperties(uid, graphId, settingsId, {
      isPublished: false,
      updatedAt: Date.now(),
    });
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
    const settingsId = `module-settings-${layerId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    if (!graph.nodes[settingsId]) {
      throw new Error('Module settings not found. Publish the module first.');
    }

    const propertyUpdates: Partial<ModuleSettingsNodeProperties> = {
      ...updates,
      updatedAt: Date.now(),
    };

    await this.nodeMutation.updateNodeProperties(uid, graphId, settingsId, propertyUpdates);
  }

  /**
   * Get current module settings
   */
  async getModuleSettings(
    uid: string,
    graphId: string,
    layerId: string
  ): Promise<ModuleSettingsNodeProperties | null> {
    const settingsId = `module-settings-${layerId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    const node = graph.nodes[settingsId];
    if (!node || node.type !== 'ModuleSettings') {
      return null;
    }

    return node.properties as ModuleSettingsNodeProperties;
  }

  /**
   * Get published modules for a course
   * Returns modules sorted by sequence
   */
  async getPublishedModules(
    uid: string,
    graphId: string
  ): Promise<PublishedModuleView[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    
    // Get all ModuleSettings nodes
    const moduleSettingsIds = graph.nodeTypes.ModuleSettings || [];
    const publishedModules: PublishedModuleView[] = [];

    for (const settingsId of moduleSettingsIds) {
      const settingsNode = graph.nodes[settingsId];
      if (!settingsNode || settingsNode.type !== 'ModuleSettings') continue;
      
      const settings = settingsNode.properties as ModuleSettingsNodeProperties;
      if (!settings.isPublished) continue;

      // Get the layer node
      const layerId = settings.layerId;
      const layerNode = graph.nodes[layerId];
      if (!layerNode) continue;

      const layerNumber = layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;

      // Count lessons in this layer
      const moduleData = await this.publishingQuery.getModuleConceptForPublishing(uid, graphId, layerId);
      const lessonCount = moduleData?.availableLessons.length ?? 0;

      // Count published lessons
      const publishedLessonCount = await this.countPublishedLessons(graph, layerId);

      publishedModules.push({
        moduleSettingsId: settingsId,
        layerId,
        title: settings.title || `Module ${layerNumber}`,
        description: settings.description || '',
        layerNumber,
        goal: layerNode.properties?.goal,
        sequence: settings.sequence,
        isPublished: settings.isPublished,
        publishedAt: settings.publishedAt,
        estimatedDuration: settings.estimatedDuration,
        isPreviewable: settings.isPreviewable ?? false,
        lessonCount,
        publishedLessonCount,
      });
    }

    // Sort by sequence
    return publishedModules.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Get seed concept data for publishing (delegates to PublishingQueryService)
   */
  async getSeedConceptForPublishing(
    uid: string,
    graphId: string
  ): Promise<SeedConceptPublishData | null> {
    return this.publishingQuery.getSeedConceptForPublishing(uid, graphId);
  }

  /**
   * Get module concept data for publishing (delegates to PublishingQueryService)
   */
  async getModuleConceptForPublishing(
    uid: string,
    graphId: string,
    moduleId: string
  ): Promise<ModuleConceptPublishData | null> {
    return this.publishingQuery.getModuleConceptForPublishing(uid, graphId, moduleId);
  }

  /**
   * Publish all modules at once
   */
  async publishAllModules(
    uid: string,
    graphId: string,
    settings?: ModulePublishSettings
  ): Promise<{ publishedCount: number; moduleSettingsIds: string[] }> {
    const seedData = await this.publishingQuery.getSeedConceptForPublishing(uid, graphId);
    if (!seedData) {
      throw new Error('Cannot publish modules: seed concept not found');
    }

    const moduleSettingsIds: string[] = [];
    
    for (const module of seedData.modules) {
      const { moduleSettingsId } = await this.publishModule(uid, graphId, module.id, {
        ...settings,
        sequence: module.layerNumber,
      });
      moduleSettingsIds.push(moduleSettingsId);
    }

    return {
      publishedCount: moduleSettingsIds.length,
      moduleSettingsIds,
    };
  }

  /**
   * Helper: Count published lessons for a layer
   */
  private async countPublishedLessons(
    graph: any,
    layerId: string
  ): Promise<number> {
    const layerNode = graph.nodes[layerId];
    if (!layerNode) return 0;

    const layerNumber = layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;
    const conceptIds = graph.nodeTypes?.Concept || [];
    let count = 0;

    for (const conceptId of conceptIds) {
      const conceptNode = graph.nodes[conceptId];
      if (!conceptNode || conceptNode.properties?.layer !== layerNumber) continue;

      // Check if there's a LessonSettings for this concept
      const lessonSettingsId = `lesson-settings-${conceptId}`;
      const lessonSettings = graph.nodes[lessonSettingsId];
      if (lessonSettings?.properties?.isPublished) {
        count++;
      }
    }

    return count;
  }
}
