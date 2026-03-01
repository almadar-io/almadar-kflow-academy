/**
 * Schedule Management Controller
 * 
 * Handles schedule slot CRUD operations
 * using the graph-based schedule management service.
 */

import { Request, Response } from 'express';
import { GraphCacheManager } from '../services/knowledgeGraphAccess/core/GraphCacheManager';
import { GraphLoader } from '../services/knowledgeGraphAccess/core/GraphLoader';
import { NodeMutationService } from '../services/knowledgeGraphAccess/mutation/NodeMutationService';
import { RelationshipMutationService } from '../services/knowledgeGraphAccess/mutation/RelationshipMutationService';
import { ScheduleManagementService } from '../services/scheduleManagementService';


// Singleton instances
const cacheManager = new GraphCacheManager();
const loader = new GraphLoader(cacheManager);
const nodeMutation = new NodeMutationService(loader);
const relMutation = new RelationshipMutationService(loader);
const scheduleService = new ScheduleManagementService(loader, nodeMutation, relMutation);

// ============================================================================
// Schedule Slot CRUD Endpoints
// ============================================================================

/**
 * GET /api/schedules?courseId=:courseId&studentUserId=:studentUserId
 * Get schedule slots (with optional filters)
 */
export const getScheduleSlotsHandler = async (
  req: Request<{}, {}, {}, { courseId?: string; studentUserId?: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, studentUserId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'Missing required query parameter: courseId' });
    }

    const filters: { studentUserId?: string; courseSettingsId?: string } = {};
    if (studentUserId) {
      filters.studentUserId = studentUserId;
    }
    if (courseId) {
      filters.courseSettingsId = `course-settings-${courseId}`;
    }

    const scheduleSlots = await scheduleService.getScheduleSlots(uid, courseId, filters);

    return res.json({ scheduleSlots });
  } catch (error: any) {
    console.error('Failed to get schedule slots:', error);
    return res.status(500).json({ error: error.message || 'Failed to get schedule slots' });
  }
};

/**
 * POST /api/schedules
 * Create a new schedule slot
 */
export const createScheduleSlotHandler = async (
  req: Request<{}, {}, {
    courseId: string;
    studentUserId: string;
    dayOfWeek: number | string;
    startTime: string;
    endTime: string;
    location?: string;
    room?: string;
    recurring?: boolean;
  }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, studentUserId, dayOfWeek, startTime, endTime, location, room, recurring } = req.body;

    if (!courseId || !studentUserId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: courseId, studentUserId, dayOfWeek, startTime, endTime' });
    }

    // Convert dayOfWeek to number if it's a string
    const dayOfWeekNum = typeof dayOfWeek === 'string' ? parseInt(dayOfWeek, 10) : dayOfWeek;
    if (isNaN(dayOfWeekNum) || dayOfWeekNum < 0 || dayOfWeekNum > 6) {
      return res.status(400).json({ error: 'Invalid dayOfWeek: must be 0-6 (Sunday-Saturday)' });
    }

    const scheduleSlot = await scheduleService.createScheduleSlot(uid, courseId, {
      studentUserId,
      courseSettingsId: `course-settings-${courseId}`,
      dayOfWeek: dayOfWeekNum,
      startTime,
      endTime,
      location,
      room,
      recurring: recurring ?? false,
    });

    return res.status(201).json({ scheduleSlot });
  } catch (error: any) {
    console.error('Failed to create schedule slot:', error);
    return res.status(500).json({ error: error.message || 'Failed to create schedule slot' });
  }
};

/**
 * PUT /api/schedules/:scheduleSlotId
 * Update a schedule slot
 */
export const updateScheduleSlotHandler = async (
  req: Request<{ scheduleSlotId: string }, {}, {
    courseId: string;
    dayOfWeek?: number | string;
    startTime?: string;
    endTime?: string;
    location?: string;
    room?: string;
    recurring?: boolean;
  }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { scheduleSlotId } = req.params;
    const { courseId, dayOfWeek, ...updates } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Missing required field: courseId' });
    }

    // Convert dayOfWeek to number if provided and it's a string
    const updateData: any = { ...updates };
    if (dayOfWeek !== undefined) {
      const dayOfWeekNum = typeof dayOfWeek === 'string' ? parseInt(dayOfWeek, 10) : dayOfWeek;
      if (isNaN(dayOfWeekNum) || dayOfWeekNum < 0 || dayOfWeekNum > 6) {
        return res.status(400).json({ error: 'Invalid dayOfWeek: must be 0-6 (Sunday-Saturday)' });
      }
      updateData.dayOfWeek = dayOfWeekNum;
    }

    const scheduleSlot = await scheduleService.updateScheduleSlot(uid, courseId, scheduleSlotId, updateData);

    return res.json({ scheduleSlot });
  } catch (error: any) {
    console.error('Failed to update schedule slot:', error);
    return res.status(500).json({ error: error.message || 'Failed to update schedule slot' });
  }
};

/**
 * DELETE /api/schedules/:scheduleSlotId
 * Delete a schedule slot
 */
export const deleteScheduleSlotHandler = async (
  req: Request<{ scheduleSlotId: string }, {}, {}, { courseId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { scheduleSlotId } = req.params;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'Missing required query parameter: courseId' });
    }

    await scheduleService.deleteScheduleSlot(uid, courseId, scheduleSlotId);

    return res.status(204).send();
  } catch (error: any) {
    console.error('Failed to delete schedule slot:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete schedule slot' });
  }
};

/**
 * GET /api/schedules/:scheduleSlotId
 * Get a single schedule slot
 */
export const getScheduleSlotHandler = async (
  req: Request<{ scheduleSlotId: string }, {}, {}, { courseId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { scheduleSlotId } = req.params;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'Missing required query parameter: courseId' });
    }

    const scheduleSlot = await scheduleService.getScheduleSlot(uid, courseId, scheduleSlotId);

    if (!scheduleSlot) {
      return res.status(404).json({ error: 'Schedule slot not found' });
    }

    return res.json({ scheduleSlot });
  } catch (error: any) {
    console.error('Failed to get schedule slot:', error);
    return res.status(500).json({ error: error.message || 'Failed to get schedule slot' });
  }
};
