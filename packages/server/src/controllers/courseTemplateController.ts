/**
 * Course Template Controller
 * 
 * Handles HTTP requests for course template operations.
 */

import { Request, Response } from 'express';
import { CourseTemplateService } from '../services/courseTemplate';
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  CourseCustomization,
  TemplateFilters,
  TemplateCategory,
  TemplateDifficulty,
} from '../types/courseTemplate';

type ErrorResponse = { error: string };

// Service instance
const templateService = new CourseTemplateService();

// ============================================================================
// System Template Endpoints
// ============================================================================

/**
 * GET /api/templates
 * List system templates, optionally filtered by category
 */
export const listSystemTemplatesHandler = async (
  req: Request<{}, {}, {}, { category?: TemplateCategory }>,
  res: Response
) => {
  try {
    const { category } = req.query;
    const templates = await templateService.getSystemTemplates(category);
    return res.json({ templates });
  } catch (error: any) {
    console.error('Failed to list system templates:', error);
    return res.status(500).json({ error: error.message || 'Failed to list templates' });
  }
};

/**
 * GET /api/templates/popular
 * Get popular templates
 */
export const getPopularTemplatesHandler = async (
  req: Request<{}, {}, {}, { limit?: string }>,
  res: Response
) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const templates = await templateService.getPopularTemplates(limit);
    return res.json({ templates });
  } catch (error: any) {
    console.error('Failed to get popular templates:', error);
    return res.status(500).json({ error: error.message || 'Failed to get popular templates' });
  }
};

/**
 * GET /api/templates/search
 * Search templates
 */
export const searchTemplatesHandler = async (
  req: Request<{}, {}, {}, { 
    q?: string;
    category?: TemplateCategory;
    difficulty?: TemplateDifficulty;
    minRating?: string;
  }>,
  res: Response
) => {
  try {
    const { q: query, category, difficulty, minRating } = req.query;
    
    const filters: TemplateFilters = {};
    if (category) filters.category = category;
    if (difficulty) filters.difficulty = difficulty;
    if (minRating) filters.minRating = parseFloat(minRating);
    
    const templates = await templateService.searchTemplates(query || '', filters);
    return res.json({ templates });
  } catch (error: any) {
    console.error('Failed to search templates:', error);
    return res.status(500).json({ error: error.message || 'Failed to search templates' });
  }
};

/**
 * GET /api/templates/:id
 * Get a single system template
 */
export const getSystemTemplateHandler = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const template = await templateService.getSystemTemplate(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    return res.json({ template });
  } catch (error: any) {
    console.error('Failed to get template:', error);
    return res.status(500).json({ error: error.message || 'Failed to get template' });
  }
};

/**
 * POST /api/templates/:id/use
 * Create a course from a template
 */
export const createCourseFromTemplateHandler = async (
  req: Request<{ id: string }, {}, CourseCustomization>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id: templateId } = req.params;
    const customizations = req.body;
    
    const result = await templateService.createCourseFromTemplate(
      uid,
      templateId,
      customizations,
      true // isSystemTemplate
    );
    
    return res.json(result);
  } catch (error: any) {
    console.error('Failed to create course from template:', error);
    return res.status(500).json({ error: error.message || 'Failed to create course from template' });
  }
};

// ============================================================================
// User Template Endpoints
// ============================================================================

/**
 * GET /api/user/templates
 * List user's templates
 */
export const listUserTemplatesHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const templates = await templateService.getUserTemplates(uid);
    return res.json({ templates });
  } catch (error: any) {
    console.error('Failed to list user templates:', error);
    return res.status(500).json({ error: error.message || 'Failed to list templates' });
  }
};

/**
 * GET /api/user/templates/:id
 * Get a single user template
 */
export const getUserTemplateHandler = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const template = await templateService.getUserTemplate(uid, id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    return res.json({ template });
  } catch (error: any) {
    console.error('Failed to get user template:', error);
    return res.status(500).json({ error: error.message || 'Failed to get template' });
  }
};

/**
 * POST /api/user/templates
 * Create a new user template
 */
export const createUserTemplateHandler = async (
  req: Request<{}, {}, CreateTemplateInput>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const input = req.body;
    
    if (!input.name || !input.modules) {
      return res.status(400).json({ error: 'Name and modules are required' });
    }
    
    const template = await templateService.createUserTemplate(uid, input);
    return res.status(201).json({ template });
  } catch (error: any) {
    console.error('Failed to create user template:', error);
    return res.status(500).json({ error: error.message || 'Failed to create template' });
  }
};

/**
 * PUT /api/user/templates/:id
 * Update a user template
 */
export const updateUserTemplateHandler = async (
  req: Request<{ id: string }, {}, UpdateTemplateInput>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    const template = await templateService.updateUserTemplate(uid, id, updates);
    return res.json({ template });
  } catch (error: any) {
    console.error('Failed to update user template:', error);
    return res.status(500).json({ error: error.message || 'Failed to update template' });
  }
};

/**
 * DELETE /api/user/templates/:id
 * Delete a user template
 */
export const deleteUserTemplateHandler = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    await templateService.deleteUserTemplate(uid, id);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete user template:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
};

/**
 * POST /api/user/templates/:id/use
 * Create a course from a user template
 */
export const createCourseFromUserTemplateHandler = async (
  req: Request<{ id: string }, {}, CourseCustomization>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id: templateId } = req.params;
    const customizations = req.body;
    
    const result = await templateService.createCourseFromTemplate(
      uid,
      templateId,
      customizations,
      false // isUserTemplate
    );
    
    return res.json(result);
  } catch (error: any) {
    console.error('Failed to create course from user template:', error);
    return res.status(500).json({ error: error.message || 'Failed to create course from template' });
  }
};

/**
 * POST /api/courses/:graphId/save-as-template
 * Save an existing course as a template
 */
export const saveCourseAsTemplateHandler = async (
  req: Request<{ graphId: string }, {}, {
    name: string;
    description: string;
    category: TemplateCategory;
    difficulty: TemplateDifficulty;
    isPublic?: boolean;
  }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { graphId } = req.params;
    const { name, description, category, difficulty, isPublic = false } = req.body;
    
    if (!name || !description || !category || !difficulty) {
      return res.status(400).json({ error: 'Name, description, category, and difficulty are required' });
    }
    
    const template = await templateService.saveCourseAsTemplate(
      uid,
      graphId,
      name,
      description,
      category,
      difficulty,
      isPublic
    );
    
    return res.status(201).json({ template });
  } catch (error: any) {
    console.error('Failed to save course as template:', error);
    return res.status(500).json({ error: error.message || 'Failed to save as template' });
  }
};
