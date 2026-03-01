/**
 * Course Template Service
 * 
 * Handles course template operations:
 * - System template retrieval
 * - User template CRUD
 * - Course creation from templates
 * - Template discovery and search
 */

import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import type {
  CourseTemplate,
  TemplateSummary,
  CreateTemplateInput,
  UpdateTemplateInput,
  CourseCustomization,
  CreateFromTemplateResult,
  TemplateFilters,
  ModuleTemplate,
  LessonTemplate,
  TemplateCategory,
  TemplateDifficulty,
} from '../../types/courseTemplate';

// Firestore collections
const SYSTEM_TEMPLATES_COLLECTION = 'courseTemplates';
const USER_TEMPLATES_COLLECTION = 'userTemplates';

/**
 * Get Firestore reference for system templates
 */
const systemTemplatesCollection = () => 
  getFirestore().collection(SYSTEM_TEMPLATES_COLLECTION);

/**
 * Get Firestore reference for user templates
 */
const userTemplatesCollection = (userId: string) =>
  getFirestore().collection(USER_TEMPLATES_COLLECTION).doc(userId).collection('templates');

/**
 * Calculate total lessons in a template
 */
const calculateLessonCount = (modules: ModuleTemplate[]): number => {
  return modules.reduce((total, module) => total + module.lessons.length, 0);
};

/**
 * Calculate estimated duration from modules/lessons
 */
const calculateEstimatedDuration = (modules: ModuleTemplate[]): number => {
  let totalMinutes = 0;
  for (const module of modules) {
    for (const lesson of module.lessons) {
      totalMinutes += lesson.estimatedMinutes || 30; // Default 30 min per lesson
    }
  }
  return Math.round(totalMinutes / 60 * 10) / 10; // Convert to hours with 1 decimal
};

/**
 * Generate IDs for modules and lessons
 */
const generateModuleIds = (modules: Omit<ModuleTemplate, 'id'>[]): ModuleTemplate[] => {
  return modules.map((module, moduleIndex) => ({
    ...module,
    id: `module-${uuidv4().slice(0, 8)}`,
    sequence: module.sequence ?? moduleIndex,
    lessons: module.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      id: `lesson-${uuidv4().slice(0, 8)}`,
      sequence: lesson.sequence ?? lessonIndex,
    })),
  }));
};

/**
 * Convert template to summary
 */
const toSummary = (template: CourseTemplate): TemplateSummary => ({
  id: template.id,
  name: template.name,
  description: template.description,
  category: template.category,
  difficulty: template.difficulty,
  thumbnailUrl: template.thumbnailUrl,
  moduleCount: template.modules.length,
  lessonCount: template.lessonCount,
  estimatedDuration: template.estimatedDuration,
  usageCount: template.usageCount,
  rating: template.rating,
  createdBy: template.createdBy,
  isPublic: template.isPublic,
  tags: template.tags,
});

export class CourseTemplateService {
  // ============================================================================
  // System Templates
  // ============================================================================

  /**
   * Get all system templates, optionally filtered by category
   */
  async getSystemTemplates(category?: TemplateCategory): Promise<TemplateSummary[]> {
    let query: FirebaseFirestore.Query = systemTemplatesCollection();
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.orderBy('usageCount', 'desc').get();
    
    return snapshot.docs.map(doc => toSummary(doc.data() as CourseTemplate));
  }

  /**
   * Get a single system template by ID
   */
  async getSystemTemplate(templateId: string): Promise<CourseTemplate | null> {
    const doc = await systemTemplatesCollection().doc(templateId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as CourseTemplate;
  }

  /**
   * Get popular templates (sorted by usage and rating)
   */
  async getPopularTemplates(limit: number = 10): Promise<TemplateSummary[]> {
    const snapshot = await systemTemplatesCollection()
      .where('isPublic', '==', true)
      .orderBy('usageCount', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => toSummary(doc.data() as CourseTemplate));
  }

  /**
   * Search templates by query and filters
   */
  async searchTemplates(
    query: string,
    filters?: TemplateFilters
  ): Promise<TemplateSummary[]> {
    // Start with system templates
    let firestoreQuery: FirebaseFirestore.Query = systemTemplatesCollection()
      .where('isPublic', '==', true);
    
    // Apply filters
    if (filters?.category) {
      firestoreQuery = firestoreQuery.where('category', '==', filters.category);
    }
    if (filters?.difficulty) {
      firestoreQuery = firestoreQuery.where('difficulty', '==', filters.difficulty);
    }
    
    const snapshot = await firestoreQuery.get();
    let results = snapshot.docs.map(doc => doc.data() as CourseTemplate);
    
    // Filter by query (name, description, tags)
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(template => 
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Filter by min rating
    if (filters?.minRating) {
      results = results.filter(t => (t.rating ?? 0) >= filters.minRating!);
    }
    
    // Sort by relevance (usage count as proxy)
    results.sort((a, b) => b.usageCount - a.usageCount);
    
    return results.map(toSummary);
  }

  // ============================================================================
  // User Templates
  // ============================================================================

  /**
   * Get all templates created by a user
   */
  async getUserTemplates(userId: string): Promise<TemplateSummary[]> {
    const snapshot = await userTemplatesCollection(userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => toSummary(doc.data() as CourseTemplate));
  }

  /**
   * Get a single user template
   */
  async getUserTemplate(userId: string, templateId: string): Promise<CourseTemplate | null> {
    const doc = await userTemplatesCollection(userId).doc(templateId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as CourseTemplate;
  }

  /**
   * Create a new user template
   */
  async createUserTemplate(
    userId: string,
    input: CreateTemplateInput
  ): Promise<CourseTemplate> {
    const templateId = `template-${uuidv4()}`;
    const now = Date.now();
    
    // Generate IDs for modules and lessons
    const modulesWithIds = generateModuleIds(input.modules);
    
    const template: CourseTemplate = {
      id: templateId,
      name: input.name,
      description: input.description,
      category: input.category,
      difficulty: input.difficulty,
      thumbnailUrl: input.thumbnailUrl,
      modules: modulesWithIds,
      estimatedDuration: calculateEstimatedDuration(modulesWithIds),
      lessonCount: calculateLessonCount(modulesWithIds),
      createdBy: userId,
      isPublic: input.isPublic,
      usageCount: 0,
      tags: input.tags,
      targetAudience: input.targetAudience,
      prerequisites: input.prerequisites,
      learningOutcomes: input.learningOutcomes,
      createdAt: now,
      updatedAt: now,
    };
    
    await userTemplatesCollection(userId).doc(templateId).set(template);
    
    return template;
  }

  /**
   * Update an existing user template
   */
  async updateUserTemplate(
    userId: string,
    templateId: string,
    updates: UpdateTemplateInput
  ): Promise<CourseTemplate> {
    const existing = await this.getUserTemplate(userId, templateId);
    if (!existing) {
      throw new Error('Template not found');
    }
    
    const updatedData: Partial<CourseTemplate> = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    // If modules are updated, recalculate metrics and generate IDs
    if (updates.modules) {
      const modulesWithIds = generateModuleIds(updates.modules);
      updatedData.modules = modulesWithIds;
      updatedData.estimatedDuration = calculateEstimatedDuration(modulesWithIds);
      updatedData.lessonCount = calculateLessonCount(modulesWithIds);
    }
    
    await userTemplatesCollection(userId).doc(templateId).update(updatedData);
    
    return {
      ...existing,
      ...updatedData,
    } as CourseTemplate;
  }

  /**
   * Delete a user template
   */
  async deleteUserTemplate(userId: string, templateId: string): Promise<void> {
    await userTemplatesCollection(userId).doc(templateId).delete();
  }

  // ============================================================================
  // Template Usage
  // ============================================================================

  /**
   * Create a new course (knowledge graph) from a template
   * This creates the graph structure and publishes it as a course
   */
  async createCourseFromTemplate(
    userId: string,
    templateId: string,
    customizations: CourseCustomization,
    isSystemTemplate: boolean = true
  ): Promise<CreateFromTemplateResult> {
    // Get the template
    const template = isSystemTemplate
      ? await this.getSystemTemplate(templateId)
      : await this.getUserTemplate(userId, templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Filter modules if specific ones selected
    let modules = template.modules;
    if (customizations.selectedModuleIds?.length) {
      modules = modules.filter(m => customizations.selectedModuleIds!.includes(m.id));
    }
    
    // TODO: Integrate with KnowledgeGraphAccessLayer to create actual graph
    // For now, return a placeholder result
    // This should:
    // 1. Create a new knowledge graph with the template structure
    // 2. Create Layer nodes for each module
    // 3. Create Concept nodes for each lesson
    // 4. Create relationships between nodes
    // 5. Publish the course using CoursePublishingService
    
    const graphId = `graph-${uuidv4()}`;
    const courseSettingsId = `course-settings-${graphId}`;
    
    // Increment usage count
    if (isSystemTemplate) {
      await systemTemplatesCollection().doc(templateId).update({
        usageCount: (template.usageCount || 0) + 1,
      });
    } else {
      await userTemplatesCollection(userId).doc(templateId).update({
        usageCount: (template.usageCount || 0) + 1,
      });
    }
    
    return {
      graphId,
      courseSettingsId,
      moduleCount: modules.length,
      lessonCount: calculateLessonCount(modules),
    };
  }

  /**
   * Save an existing course as a template
   */
  async saveCourseAsTemplate(
    userId: string,
    graphId: string,
    templateName: string,
    description: string,
    category: TemplateCategory,
    difficulty: TemplateDifficulty,
    isPublic: boolean = false
  ): Promise<CourseTemplate> {
    // TODO: Integrate with KnowledgeGraphAccessLayer to extract course structure
    // For now, create a placeholder template
    // This should:
    // 1. Get the graph structure using KnowledgeGraphAccessLayer
    // 2. Extract Layer nodes as modules
    // 3. Extract Concept nodes as lessons
    // 4. Create template structure from the graph
    
    const templateId = `template-${uuidv4()}`;
    const now = Date.now();
    
    // Placeholder structure - in real implementation, extract from graph
    const template: CourseTemplate = {
      id: templateId,
      name: templateName,
      description,
      category,
      difficulty,
      modules: [],
      estimatedDuration: 0,
      lessonCount: 0,
      createdBy: userId,
      isPublic,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    await userTemplatesCollection(userId).doc(templateId).set(template);
    
    return template;
  }

  // ============================================================================
  // Admin Operations (for seeding system templates)
  // ============================================================================

  /**
   * Create a system template (admin only)
   */
  async createSystemTemplate(template: Omit<CourseTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<CourseTemplate> {
    const templateId = `system-${uuidv4()}`;
    const now = Date.now();
    
    const fullTemplate: CourseTemplate = {
      ...template,
      id: templateId,
      createdBy: 'system',
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    await systemTemplatesCollection().doc(templateId).set(fullTemplate);
    
    return fullTemplate;
  }

  /**
   * Update a system template (admin only)
   */
  async updateSystemTemplate(
    templateId: string,
    updates: UpdateTemplateInput
  ): Promise<CourseTemplate> {
    const existing = await this.getSystemTemplate(templateId);
    if (!existing) {
      throw new Error('System template not found');
    }
    
    const updatedData: Partial<CourseTemplate> = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    if (updates.modules) {
      const modulesWithIds = generateModuleIds(updates.modules);
      updatedData.modules = modulesWithIds;
      updatedData.estimatedDuration = calculateEstimatedDuration(modulesWithIds);
      updatedData.lessonCount = calculateLessonCount(modulesWithIds);
    }
    
    await systemTemplatesCollection().doc(templateId).update(updatedData);
    
    return {
      ...existing,
      ...updatedData,
    } as CourseTemplate;
  }

  /**
   * Delete a system template (admin only)
   */
  async deleteSystemTemplate(templateId: string): Promise<void> {
    await systemTemplatesCollection().doc(templateId).delete();
  }
}
