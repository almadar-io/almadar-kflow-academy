/**
 * Course Publishing Service
 * 
 * Handles course-level publishing operations:
 * - Publish/unpublish courses (creates/removes CourseSettings nodes)
 * - Update course settings
 * - Get published course view for students
 */

import type { GraphLoader } from '../core/GraphLoader';
import type { NodeMutationService } from '../mutation/NodeMutationService';
import type { RelationshipMutationService } from '../mutation/RelationshipMutationService';
import type { PublishingQueryService, SeedConceptPublishData, GraphMetadataPublishData } from './PublishingQueryService';
import {
  createCourseSettingsNode,
  createPublishingRelationship,
  createGraphNode,
  type CourseSettingsNodeProperties,
  type CourseVisibility,
} from '../../../types/nodeBasedKnowledgeGraph';

/**
 * Input settings for publishing a course
 */
export interface CoursePublishSettings {
  title?: string;
  description?: string;
  visibility?: CourseVisibility;
  enrollmentEnabled?: boolean;
  maxStudents?: number;
  price?: number;
  currency?: string;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
  estimatedDuration?: number;
  supportedLanguages?: string[];
  defaultLanguage?: string;
}

/**
 * Published course view for students
 */
export interface PublishedCourseView {
  courseSettingsId: string;
  graphId: string;
  title: string;
  description: string;
  visibility: CourseVisibility;
  isPublished: boolean;
  publishedAt?: number;
  enrollmentEnabled: boolean;
  maxStudents?: number;
  price?: number;
  currency?: string;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
  estimatedDuration?: number;
  difficulty?: string;
  supportedLanguages?: string[];
  defaultLanguage?: string;
  // Course structure
  seed: SeedConceptPublishData;
  totalModules: number;
  totalLessons: number;
}

export class CoursePublishingService {
  constructor(
    private loader: GraphLoader,
    private nodeMutation: NodeMutationService,
    private relMutation: RelationshipMutationService,
    private publishingQuery: PublishingQueryService
  ) {}

  /**
   * Publish a course - creates a CourseSettings node in the graph
   */
  async publishCourse(
    uid: string,
    graphId: string,
    settings: CoursePublishSettings
  ): Promise<{ courseSettingsId: string }> {
    const graph = await this.loader.getGraph(uid, graphId);
    
    // Check if already published
    const existingSettingsId = `course-settings-${graphId}`;
    if (graph.nodes[existingSettingsId]) {
      // Update instead
      await this.updateCourseSettings(uid, graphId, settings);
      return { courseSettingsId: existingSettingsId };
    }

    // Get seed concept data for defaults
    const seedData = await this.publishingQuery.getSeedConceptForPublishing(uid, graphId);
    if (!seedData) {
      throw new Error('Cannot publish course: seed concept not found');
    }

    // Create CourseSettings node
    const courseSettingsNode = createCourseSettingsNode(graphId, {
      title: settings.title || seedData.name,
      description: settings.description || seedData.description,
      visibility: settings.visibility || 'private',
      isPublished: true,
      publishedAt: Date.now(),
      enrollmentEnabled: settings.enrollmentEnabled ?? true,
      maxStudents: settings.maxStudents,
      price: settings.price,
      currency: settings.currency,
      thumbnailUrl: settings.thumbnailUrl,
      tags: settings.tags,
      category: settings.category,
      estimatedDuration: settings.estimatedDuration,
      supportedLanguages: settings.supportedLanguages || ['en'],
      defaultLanguage: settings.defaultLanguage || 'en',
      enrolledMentorId: uid, // Auto-enroll mentor
      enrolledStudentIds: [], // Initialize empty array
    });

    // Add the node to the graph
    await this.nodeMutation.createNode(uid, graphId, courseSettingsNode);

    // Ensure Graph node exists before creating relationship
    let graphNodeId = graph.nodeTypes.Graph?.[0];
    if (!graphNodeId || !graph.nodes[graphNodeId]) {
      // Create Graph node if it doesn't exist
      const graphNode = createGraphNode(graphId, 'Graph', {
        id: graphId,
        name: seedData.name,
      });
      await this.nodeMutation.createNode(uid, graphId, graphNode);
      graphNodeId = graphId;
    }

    // Create relationship from Graph node to CourseSettings
    const relationship = createPublishingRelationship(
      graphNodeId,
      courseSettingsNode.id,
      'hasCourseSettings'
    );
    await this.relMutation.createRelationship(uid, graphId, relationship);

    return { courseSettingsId: courseSettingsNode.id };
  }

  /**
   * Unpublish a course - marks CourseSettings as unpublished
   */
  async unpublishCourse(uid: string, graphId: string): Promise<void> {
    const settingsId = `course-settings-${graphId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    if (!graph.nodes[settingsId]) {
      throw new Error('Course is not published');
    }

    // Update to unpublished state
    await this.nodeMutation.updateNodeProperties(uid, graphId, settingsId, {
      isPublished: false,
      unpublishedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Update course settings
   */
  async updateCourseSettings(
    uid: string,
    graphId: string,
    updates: Partial<CoursePublishSettings>
  ): Promise<void> {
    const settingsId = `course-settings-${graphId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    if (!graph.nodes[settingsId]) {
      throw new Error('Course settings not found. Publish the course first.');
    }

    const propertyUpdates: Partial<CourseSettingsNodeProperties> = {
      ...updates,
      updatedAt: Date.now(),
    };

    await this.nodeMutation.updateNodeProperties(uid, graphId, settingsId, propertyUpdates);
  }

  /**
   * Get current course settings
   */
  async getCourseSettings(
    uid: string,
    graphId: string
  ): Promise<CourseSettingsNodeProperties | null> {
    const settingsId = `course-settings-${graphId}`;
    const graph = await this.loader.getGraph(uid, graphId);
    
    const node = graph.nodes[settingsId];
    if (!node || node.type !== 'CourseSettings') {
      return null;
    }

    return node.properties as CourseSettingsNodeProperties;
  }

  /**
   * Get published course view for students
   * This combines course settings with structure data
   */
  async getPublishedCourseView(
    mentorId: string,
    graphId: string,
    studentLanguage?: string
  ): Promise<PublishedCourseView | null> {
    const courseSettings = await this.getCourseSettings(mentorId, graphId);
    if (!courseSettings || !courseSettings.isPublished) {
      return null;
    }

    const graph = await this.loader.getGraph(mentorId, graphId);
    const courseSettingsId = `course-settings-${graphId}`;

    // Get published modules by traversing relationships from CourseSettings
    const publishedModuleSettings: string[] = [];
    const relationships = graph.relationships || [];
    for (const rel of relationships) {
      if (rel.source === courseSettingsId && rel.type === 'hasModuleSettings') {
        const moduleSettingsNode = graph.nodes[rel.target];
        if (moduleSettingsNode && moduleSettingsNode.type === 'ModuleSettings') {
          const settings = moduleSettingsNode.properties as any;
          if (settings.isPublished) {
            publishedModuleSettings.push(rel.target);
          }
        }
      }
    }

    // Get seed data for all modules (we'll filter to published ones)
    const seedData = await this.publishingQuery.getSeedConceptForPublishing(mentorId, graphId);
    if (!seedData) {
      return null;
    }

    // Filter modules to only published ones
    const publishedModules = seedData.modules.filter(module => {
      const moduleSettingsId = `module-settings-${module.id}`;
      return publishedModuleSettings.includes(moduleSettingsId);
    });

    // Calculate total published lessons
    let totalLessons = 0;
    for (const module of publishedModules) {
      // Count published lessons in this module
      const moduleSettingsId = `module-settings-${module.id}`;
      let publishedLessonCount = 0;
      for (const rel of relationships) {
        if (rel.source === moduleSettingsId && rel.type === 'hasLessonSettings') {
          const lessonSettingsNode = graph.nodes[rel.target];
          if (lessonSettingsNode && lessonSettingsNode.type === 'LessonSettings') {
            const settings = lessonSettingsNode.properties as any;
            if (settings.isPublished) {
              publishedLessonCount++;
            }
          }
        }
      }
      totalLessons += publishedLessonCount;
    }

    const metadata = await this.publishingQuery.getGraphMetadataForPublishing(mentorId, graphId);

    // Return filtered seed data with only published modules
    const filteredSeedData = {
      ...seedData,
      modules: publishedModules,
    };

    return {
      courseSettingsId: courseSettings.id,
      graphId,
      title: courseSettings.title,
      description: courseSettings.description,
      visibility: courseSettings.visibility,
      isPublished: courseSettings.isPublished,
      publishedAt: courseSettings.publishedAt,
      enrollmentEnabled: courseSettings.enrollmentEnabled,
      maxStudents: courseSettings.maxStudents,
      price: courseSettings.price,
      currency: courseSettings.currency,
      thumbnailUrl: courseSettings.thumbnailUrl,
      tags: courseSettings.tags,
      category: courseSettings.category,
      estimatedDuration: courseSettings.estimatedDuration,
      difficulty: metadata?.difficulty,
      supportedLanguages: courseSettings.supportedLanguages,
      defaultLanguage: courseSettings.defaultLanguage,
      seed: filteredSeedData,
      totalModules: publishedModules.length,
      totalLessons,
    };
  }

  /**
   * Get graph metadata for publishing view
   */
  async getGraphMetadataForPublishing(
    uid: string,
    graphId: string
  ): Promise<GraphMetadataPublishData | null> {
    return this.publishingQuery.getGraphMetadataForPublishing(uid, graphId);
  }

  /**
   * Check if a course is published
   */
  async isCoursePublished(uid: string, graphId: string): Promise<boolean> {
    const settings = await this.getCourseSettings(uid, graphId);
    return settings?.isPublished ?? false;
  }

  /**
   * Ensure CourseSettings exists - auto-creates with default settings if missing
   * This is called when modules or lessons are published to ensure the course appears
   */
  async ensureCourseSettingsExists(
    uid: string,
    graphId: string
  ): Promise<{ courseSettingsId: string; wasCreated: boolean }> {
    const graph = await this.loader.getGraph(uid, graphId);
    const existingSettingsId = `course-settings-${graphId}`;
    
    // If CourseSettings already exists, return it
    if (graph.nodes[existingSettingsId]) {
      return { courseSettingsId: existingSettingsId, wasCreated: false };
    }

    // Get seed concept data for defaults
    const seedData = await this.publishingQuery.getSeedConceptForPublishing(uid, graphId);
    if (!seedData) {
      throw new Error('Cannot auto-create course settings: seed concept not found');
    }

    // Create CourseSettings node with default settings
    const courseSettingsNode = createCourseSettingsNode(graphId, {
      title: seedData.name,
      description: seedData.description || '',
      visibility: 'private',
      isPublished: true,
      publishedAt: Date.now(),
      enrollmentEnabled: true,
      supportedLanguages: ['en'],
      defaultLanguage: 'en',
      enrolledMentorId: uid, // Auto-enroll mentor
      enrolledStudentIds: [], // Initialize empty array
    });

    // Add the node to the graph
    await this.nodeMutation.createNode(uid, graphId, courseSettingsNode);

    // Ensure Graph node exists before creating relationship
    let graphNodeId = graph.nodeTypes.Graph?.[0];
    if (!graphNodeId || !graph.nodes[graphNodeId]) {
      // Create Graph node if it doesn't exist
      const graphNode = createGraphNode(graphId, 'Graph', {
        id: graphId,
        name: seedData.name,
      });
      await this.nodeMutation.createNode(uid, graphId, graphNode);
      graphNodeId = graphId;
    }

    // Create relationship from Graph node to CourseSettings
    const relationship = createPublishingRelationship(
      graphNodeId,
      courseSettingsNode.id,
      'hasCourseSettings'
    );
    await this.relMutation.createRelationship(uid, graphId, relationship);

    return { courseSettingsId: courseSettingsNode.id, wasCreated: true };
  }
}
