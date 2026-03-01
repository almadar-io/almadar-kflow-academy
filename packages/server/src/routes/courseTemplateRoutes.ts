/**
 * Course Template Routes
 * 
 * API endpoints for course template operations.
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  // System templates
  listSystemTemplatesHandler,
  getPopularTemplatesHandler,
  searchTemplatesHandler,
  getSystemTemplateHandler,
  createCourseFromTemplateHandler,
  // User templates
  listUserTemplatesHandler,
  getUserTemplateHandler,
  createUserTemplateHandler,
  updateUserTemplateHandler,
  deleteUserTemplateHandler,
  createCourseFromUserTemplateHandler,
  saveCourseAsTemplateHandler,
} from '../controllers/courseTemplateController';

const router = Router();

// =============================================================================
// System Template Routes (public browsing, authenticated for usage)
// =============================================================================

// List system templates
router.get('/templates', listSystemTemplatesHandler);

// Get popular templates
router.get('/templates/popular', getPopularTemplatesHandler);

// Search templates
router.get('/templates/search', searchTemplatesHandler);

// Get single system template
router.get('/templates/:id', getSystemTemplateHandler);

// Create course from system template (requires auth)
router.post('/templates/:id/use', authenticateFirebase, createCourseFromTemplateHandler);

// =============================================================================
// User Template Routes (all require authentication)
// =============================================================================

// List user's templates
router.get('/user/templates', authenticateFirebase, listUserTemplatesHandler);

// Get single user template
router.get('/user/templates/:id', authenticateFirebase, getUserTemplateHandler);

// Create new user template
router.post('/user/templates', authenticateFirebase, createUserTemplateHandler);

// Update user template
router.put('/user/templates/:id', authenticateFirebase, updateUserTemplateHandler);

// Delete user template
router.delete('/user/templates/:id', authenticateFirebase, deleteUserTemplateHandler);

// Create course from user template
router.post('/user/templates/:id/use', authenticateFirebase, createCourseFromUserTemplateHandler);

// =============================================================================
// Course to Template Route
// =============================================================================

// Save existing course as template
router.post('/courses/:graphId/save-as-template', authenticateFirebase, saveCourseAsTemplateHandler);

export default router;
