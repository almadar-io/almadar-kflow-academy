/**
 * Lesson Publishing Service
 * 
 * Handles lesson-level (concept) publishing operations:
 * - Publish/unpublish lessons (creates/removes LessonSettings nodes)
 * - Update lesson settings
 * - Get published lessons for a module
 */

import type { GraphLoader } from '../core/GraphLoader';
import type { NodeMutationService } from '../mutation/NodeMutationService';
import type { RelationshipMutationService } from '../mutation/RelationshipMutationService';
import type { PublishingQueryService, LessonContentPublishData, ModuleConceptPublishData } from './PublishingQueryService';
import type { CoursePublishingService } from './CoursePublishingService';
import {
  createLessonSettingsNode,
  createPublishingRelationship,
  type LessonSettingsNodeProperties,
} from '../../../types/nodeBasedKnowledgeGraph';

/**
 * Input settings for publishing a lesson
 */
export interface LessonPublishSettings {
  title?: string;
  description?: string;
  sequence?: number;
  hasAssessment?: boolean;
  assessmentRequired?: boolean;
  passingScore?: number;
  estimatedDuration?: number;
  isPreviewable?: boolean;
}

/**
 * Published lesson view for students
 */
export interface PublishedLessonView {
  lessonSettingsId: string;
  conceptId: string;
  title: string;
  description: string;
  sequence: number;
  isPublished: boolean;
  publishedAt?: number;
  hasAssessment: boolean;
  assessmentRequired: boolean;
  passingScore?: number;
  estimatedDuration?: number;
  isPreviewable: boolean;
  hasContent: boolean;
  hasFlashCards: boolean;
}

export class LessonPublishingService {
  constructor(
    private loader: GraphLoader,
    private nodeMutation: NodeMutationService,
    private relMutation: RelationshipMutationService,
    private publishingQuery: PublishingQueryService,
    private coursePublishing: CoursePublishingService
  ) {}

  /**
   * Publish a lesson - creates a LessonSettings node in the graph
   * @param conceptId - The Concept node ID to publish as a lesson
   */
  async publishLesson(
    uid: string,
    graphId: string,
    conceptId: string,
    settings?: LessonPublishSettings
  ): Promise<{ lessonSettingsId: string }> {
    const graph = await this.loader.getGraph(uid, graphId);
    
    // Ensure CourseSettings exists - auto-create if missing
    // This ensures the course appears in MentorPage even if lessons are published first
    await this.coursePublishing.ensureCourseSettingsExists(uid, graphId);
    
    // Verify the concept exists
    const conceptNode = graph.nodes[conceptId];
    if (!conceptNode || conceptNode.type !== 'Concept') {
      throw new Error(`Concept ${conceptId} not found`);
    }

    // Check if already published
    const existingSettingsId = `lesson-settings-${conceptId}`;
    if (graph.nodes[existingSettingsId]) {
      // Update instead
      await this.updateLessonSettings(uid, graphId, conceptId, settings || {});
      return { lessonSettingsId: existingSettingsId };
    }

    const sequence = conceptNode.properties?.sequence ?? 0;

    // Create LessonSettings node
    const lessonSettingsNode = createLessonSettingsNode(conceptId, {
      title: settings?.title || conceptNode.properties?.name || conceptId,
      description: settings?.description || conceptNode.properties?.description || '',
      isPublished: true,
      publishedAt: Date.now(),
      sequence: settings?.sequence ?? sequence,
      hasAssessment: settings?.hasAssessment ?? false,
      assessmentRequired: settings?.assessmentRequired,
      passingScore: settings?.passingScore,
      estimatedDuration: settings?.estimatedDuration,
      isPreviewable: settings?.isPreviewable ?? false,
    });

    // Add the node to the graph
    await this.nodeMutation.createNode(uid, graphId, lessonSettingsNode);

    // Create relationship from Concept node to LessonSettings
    const conceptToSettingsRel = createPublishingRelationship(
      conceptId,
      lessonSettingsNode.id,
      'hasLessonSettings'
    );
    await this.relMutation.createRelationship(uid, graphId, conceptToSettingsRel);

    // Find the module (Layer) that contains this lesson (Concept) and create relationship
    // conceptNode was already retrieved above, reuse it
    if (conceptNode && conceptNode.properties?.layer !== undefined) {
      const layerNumber = conceptNode.properties.layer;
      const layerNodeIds = graph.nodeTypes?.Layer || [];
      
      // Find the layer node for this concept
      for (const layerId of layerNodeIds) {
        const layerNode = graph.nodes[layerId];
        if (layerNode && layerNode.type === 'Layer') {
          const layerNum = layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;
          if (layerNum === layerNumber) {
            // Find ModuleSettings for this layer
            const moduleSettingsId = `module-settings-${layerId}`;
            if (graph.nodes[moduleSettingsId]) {
              // Create relationship from ModuleSettings to LessonSettings
              const moduleToLessonRel = createPublishingRelationship(
                moduleSettingsId,
                lessonSettingsNode.id,
                'hasLessonSettings'
              );
              await this.relMutation.createRelationship(uid, graphId, moduleToLessonRel);
            }
            break;
          }
        }
      }
    }

    return { lessonSettingsId: lessonSettingsNode.id };
  }

  /**
   * Unpublish a lesson - marks LessonSettings as unpublished
   */
  async unpublishLesson(uid: string, graphId: string, conceptId: string): Promise<void> {
    const settingsId = `lesson-settings-${conceptId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    if (!graph.nodes[settingsId]) {
      throw new Error('Lesson is not published');
    }

    // Update to unpublished state
    await this.nodeMutation.updateNodeProperties(uid, graphId, settingsId, {
      isPublished: false,
      updatedAt: Date.now(),
    });
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
    const settingsId = `lesson-settings-${conceptId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    if (!graph.nodes[settingsId]) {
      throw new Error('Lesson settings not found. Publish the lesson first.');
    }

    const propertyUpdates: Partial<LessonSettingsNodeProperties> = {
      ...updates,
      updatedAt: Date.now(),
    };

    await this.nodeMutation.updateNodeProperties(uid, graphId, settingsId, propertyUpdates);
  }

  /**
   * Get current lesson settings
   */
  async getLessonSettings(
    uid: string,
    graphId: string,
    conceptId: string
  ): Promise<LessonSettingsNodeProperties | null> {
    const settingsId = `lesson-settings-${conceptId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    const node = graph.nodes[settingsId];
    if (!node || node.type !== 'LessonSettings') {
      return null;
    }

    return node.properties as LessonSettingsNodeProperties;
  }

  /**
   * Get published lessons for a module (layer)
   * Returns lessons sorted by sequence
   */
  async getPublishedLessons(
    uid: string,
    graphId: string,
    layerId: string
  ): Promise<PublishedLessonView[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    
    // Get the layer to find its layer number
    const layerNode = graph.nodes[layerId];
    if (!layerNode || layerNode.type !== 'Layer') {
      return [];
    }

    const layerNumber = layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;
    
    // Find all concepts in this layer
    const conceptIds = graph.nodeTypes?.Concept || [];
    const publishedLessons: PublishedLessonView[] = [];

    for (const conceptId of conceptIds) {
      const conceptNode = graph.nodes[conceptId];
      if (!conceptNode || conceptNode.properties?.layer !== layerNumber) continue;

      // Check for LessonSettings
      const settingsId = `lesson-settings-${conceptId}`;
      const settingsNode = graph.nodes[settingsId];
      
      if (!settingsNode || settingsNode.type !== 'LessonSettings') continue;
      
      const settings = settingsNode.properties as LessonSettingsNodeProperties;
      if (!settings.isPublished) continue;

      // Get content info
      const contentData = await this.publishingQuery.getLessonContentForPublishing(uid, graphId, conceptId);

      publishedLessons.push({
        lessonSettingsId: settingsId,
        conceptId,
        title: settings.title || conceptNode.properties?.name || conceptId,
        description: settings.description || conceptNode.properties?.description || '',
        sequence: settings.sequence,
        isPublished: settings.isPublished,
        publishedAt: settings.publishedAt,
        hasAssessment: settings.hasAssessment,
        assessmentRequired: settings.assessmentRequired ?? false,
        passingScore: settings.passingScore,
        estimatedDuration: settings.estimatedDuration,
        isPreviewable: settings.isPreviewable ?? false,
        hasContent: !!contentData?.content,
        hasFlashCards: !!contentData?.flashCards && contentData.flashCards.length > 0,
      });
    }

    // Sort by sequence
    return publishedLessons.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Get lesson content for publishing (delegates to PublishingQueryService)
   */
  async getLessonContentForPublishing(
    uid: string,
    graphId: string,
    conceptId: string
  ): Promise<LessonContentPublishData | null> {
    return this.publishingQuery.getLessonContentForPublishing(uid, graphId, conceptId);
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
   * Publish all lessons in a module
   */
  async publishAllLessonsInModule(
    uid: string,
    graphId: string,
    layerId: string,
    settings?: LessonPublishSettings
  ): Promise<{ publishedCount: number; lessonSettingsIds: string[] }> {
    const moduleData = await this.publishingQuery.getModuleConceptForPublishing(uid, graphId, layerId);
    if (!moduleData) {
      throw new Error(`Module ${layerId} not found`);
    }

    const lessonSettingsIds: string[] = [];
    
    for (const lesson of moduleData.availableLessons) {
      const { lessonSettingsId } = await this.publishLesson(uid, graphId, lesson.id, {
        ...settings,
        sequence: lesson.sequence ?? lessonSettingsIds.length,
      });
      lessonSettingsIds.push(lessonSettingsId);
    }

    return {
      publishedCount: lessonSettingsIds.length,
      lessonSettingsIds,
    };
  }

  /**
   * Get all published lessons in a course (across all modules)
   */
  async getAllPublishedLessons(
    uid: string,
    graphId: string
  ): Promise<PublishedLessonView[]> {
    const graph = await this.loader.getGraph(uid, graphId);
    
    // Get all LessonSettings nodes
    const lessonSettingsIds = graph.nodeTypes.LessonSettings || [];
    const publishedLessons: PublishedLessonView[] = [];

    for (const settingsId of lessonSettingsIds) {
      const settingsNode = graph.nodes[settingsId];
      if (!settingsNode || settingsNode.type !== 'LessonSettings') continue;
      
      const settings = settingsNode.properties as LessonSettingsNodeProperties;
      if (!settings.isPublished) continue;

      const conceptId = settings.conceptId;
      const conceptNode = graph.nodes[conceptId];
      if (!conceptNode) continue;

      // Get content info
      const contentData = await this.publishingQuery.getLessonContentForPublishing(uid, graphId, conceptId);

      publishedLessons.push({
        lessonSettingsId: settingsId,
        conceptId,
        title: settings.title || conceptNode.properties?.name || conceptId,
        description: settings.description || conceptNode.properties?.description || '',
        sequence: settings.sequence,
        isPublished: settings.isPublished,
        publishedAt: settings.publishedAt,
        hasAssessment: settings.hasAssessment,
        assessmentRequired: settings.assessmentRequired ?? false,
        passingScore: settings.passingScore,
        estimatedDuration: settings.estimatedDuration,
        isPreviewable: settings.isPreviewable ?? false,
        hasContent: !!contentData?.content,
        hasFlashCards: !!contentData?.flashCards && contentData.flashCards.length > 0,
      });
    }

    // Sort by sequence
    return publishedLessons.sort((a, b) => a.sequence - b.sequence);
  }
}
