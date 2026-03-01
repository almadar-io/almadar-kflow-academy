/**
 * Schedule Management Service
 * 
 * Handles schedule slot CRUD operations:
 * - Create/update/delete ScheduleSlot nodes
 * - Query schedule slots (with filters by student, course, etc.)
 * - Manage relationships (belongsToStudent, assignedToCourse)
 */

import type { GraphLoader } from './knowledgeGraphAccess/core/GraphLoader';
import type { NodeMutationService } from './knowledgeGraphAccess/mutation/NodeMutationService';
import type { RelationshipMutationService } from './knowledgeGraphAccess/mutation/RelationshipMutationService';
import {
  createScheduleSlotNode,
  createRelationship,
  type ScheduleSlotNodeProperties,
} from '../types/nodeBasedKnowledgeGraph';

export interface CreateScheduleSlotInput {
  studentUserId: string;
  courseSettingsId?: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // ISO time string (e.g., "14:30:00")
  endTime: string; // ISO time string (e.g., "15:30:00")
  location?: string;
  room?: string;
  recurring?: boolean;
}

export interface UpdateScheduleSlotInput {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  location?: string;
  room?: string;
  recurring?: boolean;
  courseSettingsId?: string;
}

export interface ScheduleSlot {
  id: string;
  studentUserId: string;
  courseSettingsId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration?: number;
  location?: string;
  room?: string;
  recurring: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleSlotFilters {
  studentUserId?: string;
  courseSettingsId?: string;
  dayOfWeek?: number;
}

export class ScheduleManagementService {
  constructor(
    private loader: GraphLoader,
    private nodeMutation: NodeMutationService,
    private relMutation: RelationshipMutationService
  ) {}

  /**
   * Create a ScheduleSlot node
   * Schedule slots are stored in the course graph
   */
  async createScheduleSlot(
    mentorId: string,
    graphId: string,
    scheduleData: CreateScheduleSlotInput
  ): Promise<ScheduleSlot> {
    // Create ScheduleSlot node
    const scheduleSlotNode = createScheduleSlotNode(
      scheduleData.studentUserId,
      {
        studentUserId: scheduleData.studentUserId,
        courseSettingsId: scheduleData.courseSettingsId,
        dayOfWeek: scheduleData.dayOfWeek,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        location: scheduleData.location,
        room: scheduleData.room,
        recurring: scheduleData.recurring ?? true,
      }
    );

    // Add the node to the course graph
    await this.nodeMutation.createNode(mentorId, graphId, scheduleSlotNode);

    // Create relationship from ScheduleSlot to Student (both in same graph)
    const studentNodeId = `student-${scheduleData.studentUserId}`;
    const belongsToStudentRel = createRelationship(
      scheduleSlotNode.id,
      studentNodeId,
      'belongsToStudent',
      'forward'
    );
    await this.relMutation.createRelationship(mentorId, graphId, belongsToStudentRel);

    // Create relationship from ScheduleSlot to CourseSettings (if course-specific)
    if (scheduleData.courseSettingsId) {
      const assignedToCourseRel = createRelationship(
        scheduleSlotNode.id,
        scheduleData.courseSettingsId,
        'assignedToCourse',
        'forward'
      );
      await this.relMutation.createRelationship(mentorId, graphId, assignedToCourseRel);
    }

    const props = scheduleSlotNode.properties as ScheduleSlotNodeProperties;
    return {
      id: props.id,
      studentUserId: props.studentUserId,
      courseSettingsId: props.courseSettingsId,
      dayOfWeek: props.dayOfWeek,
      startTime: props.startTime,
      endTime: props.endTime,
      duration: props.duration,
      location: props.location,
      room: props.room,
      recurring: props.recurring,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  /**
   * Update a ScheduleSlot node
   */
  async updateScheduleSlot(
    mentorId: string,
    graphId: string,
    scheduleSlotId: string,
    updates: UpdateScheduleSlotInput
  ): Promise<ScheduleSlot> {
    const graph = await this.loader.getGraph(mentorId, graphId);
    
    const existingNode = graph.nodes[scheduleSlotId];
    
    if (!existingNode || existingNode.type !== 'ScheduleSlot') {
      throw new Error(`Schedule slot with id ${scheduleSlotId} not found`);
    }

    const props = existingNode.properties as ScheduleSlotNodeProperties;
    
    // Calculate duration if times changed
    let duration = props.duration;
    const startTime = updates.startTime || props.startTime;
    const endTime = updates.endTime || props.endTime;
    if (updates.startTime || updates.endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
    }

    const updatedProps: ScheduleSlotNodeProperties = {
      ...props,
      ...updates,
      duration,
      updatedAt: Date.now(),
    };

    await this.nodeMutation.updateNode(mentorId, graphId, scheduleSlotId, {
      properties: updatedProps,
      updatedAt: Date.now(),
    });

    // Update relationships if course changed
    if (updates.courseSettingsId !== undefined && updates.courseSettingsId !== props.courseSettingsId) {
      // Delete old course relationship if exists
      if (props.courseSettingsId) {
        const oldRel = graph.relationships.find(
          rel =>
            rel.source === scheduleSlotId &&
            rel.target === props.courseSettingsId &&
            rel.type === 'assignedToCourse'
        );
        if (oldRel) {
          await this.relMutation.deleteRelationship(mentorId, graphId, oldRel.id);
        }
      }

      // Create new course relationship if new course specified
      if (updates.courseSettingsId) {
        const newRel = createRelationship(
          scheduleSlotId,
          updates.courseSettingsId,
          'assignedToCourse',
          'forward'
        );
        await this.relMutation.createRelationship(mentorId, graphId, newRel);
      }
    }

    return {
      id: updatedProps.id,
      studentUserId: updatedProps.studentUserId,
      courseSettingsId: updatedProps.courseSettingsId,
      dayOfWeek: updatedProps.dayOfWeek,
      startTime: updatedProps.startTime,
      endTime: updatedProps.endTime,
      duration: updatedProps.duration,
      location: updatedProps.location,
      room: updatedProps.room,
      recurring: updatedProps.recurring,
      createdAt: updatedProps.createdAt,
      updatedAt: updatedProps.updatedAt,
    };
  }

  /**
   * Delete a ScheduleSlot node and all related relationships
   */
  async deleteScheduleSlot(
    mentorId: string,
    graphId: string,
    scheduleSlotId: string
  ): Promise<void> {
    const graph = await this.loader.getGraph(mentorId, graphId);
    
    const existingNode = graph.nodes[scheduleSlotId];
    
    if (!existingNode || existingNode.type !== 'ScheduleSlot') {
      throw new Error(`Schedule slot with id ${scheduleSlotId} not found`);
    }

    // Delete all relationships involving this schedule slot
    const relationshipsToDelete = graph.relationships.filter(
      rel => rel.source === scheduleSlotId || rel.target === scheduleSlotId
    );

    for (const rel of relationshipsToDelete) {
      await this.relMutation.deleteRelationship(mentorId, graphId, rel.id);
    }

    // Delete the schedule slot node
    await this.nodeMutation.deleteNode(mentorId, graphId, scheduleSlotId);
  }

  /**
   * Get a schedule slot by ID
   */
  async getScheduleSlot(
    mentorId: string,
    graphId: string,
    scheduleSlotId: string
  ): Promise<ScheduleSlot | null> {
    try {
      const graph = await this.loader.getGraph(mentorId, graphId);
      const node = graph.nodes[scheduleSlotId];
      
      if (!node || node.type !== 'ScheduleSlot') {
        return null;
      }

      const props = node.properties as ScheduleSlotNodeProperties;
      return {
        id: props.id,
        studentUserId: props.studentUserId,
        courseSettingsId: props.courseSettingsId,
        dayOfWeek: props.dayOfWeek,
        startTime: props.startTime,
        endTime: props.endTime,
        duration: props.duration,
        location: props.location,
        room: props.room,
        recurring: props.recurring,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get schedule slots with optional filters
   */
  async getScheduleSlots(
    mentorId: string,
    graphId: string,
    filters?: ScheduleSlotFilters
  ): Promise<ScheduleSlot[]> {
    try {
      const graph = await this.loader.getGraph(mentorId, graphId);
      let scheduleSlotNodes = Object.values(graph.nodes).filter(
        node => node.type === 'ScheduleSlot'
      );

      // Apply filters
      if (filters) {
        if (filters.studentUserId) {
          scheduleSlotNodes = scheduleSlotNodes.filter(node => {
            const props = node.properties as ScheduleSlotNodeProperties;
            return props.studentUserId === filters.studentUserId;
          });
        }

        if (filters.courseSettingsId !== undefined) {
          scheduleSlotNodes = scheduleSlotNodes.filter(node => {
            const props = node.properties as ScheduleSlotNodeProperties;
            return props.courseSettingsId === filters.courseSettingsId;
          });
        }

        if (filters.dayOfWeek !== undefined) {
          scheduleSlotNodes = scheduleSlotNodes.filter(node => {
            const props = node.properties as ScheduleSlotNodeProperties;
            return props.dayOfWeek === filters.dayOfWeek;
          });
        }
      }

      return scheduleSlotNodes.map(node => {
        const props = node.properties as ScheduleSlotNodeProperties;
        return {
          id: props.id,
          studentUserId: props.studentUserId,
          courseSettingsId: props.courseSettingsId,
          dayOfWeek: props.dayOfWeek,
          startTime: props.startTime,
          endTime: props.endTime,
          duration: props.duration,
          location: props.location,
          room: props.room,
          recurring: props.recurring,
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
        };
      });
    } catch (error) {
      // Graph doesn't exist yet, return empty array
      return [];
    }
  }

  /**
   * Get schedule slots for a specific student
   */
  async getStudentSchedule(
    mentorId: string,
    graphId: string,
    studentUserId: string
  ): Promise<ScheduleSlot[]> {
    return this.getScheduleSlots(mentorId, graphId, { studentUserId });
  }

  /**
   * Get schedule slots for a specific course
   */
  async getCourseSchedule(
    mentorId: string,
    graphId: string,
    courseSettingsId: string
  ): Promise<ScheduleSlot[]> {
    return this.getScheduleSlots(mentorId, graphId, { courseSettingsId });
  }
}
