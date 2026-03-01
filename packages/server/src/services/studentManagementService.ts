/**
 * Student Management Service
 * 
 * Handles student CRUD operations and enrollment management:
 * - Create/update/delete Student nodes
 * - Enroll/unenroll students in courses (updates CourseSettings.enrolledStudentIds)
 * - Query students
 */

import type { GraphLoader } from './knowledgeGraphAccess/core/GraphLoader';
import type { NodeMutationService } from './knowledgeGraphAccess/mutation/NodeMutationService';
import type { RelationshipMutationService } from './knowledgeGraphAccess/mutation/RelationshipMutationService';
import {
  createStudentNode,
  createRelationship,
  type StudentNodeProperties,
} from '../types/nodeBasedKnowledgeGraph';

export interface CreateStudentInput {
  userId: string;
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateStudentInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: number;
  updatedAt: number;
}

export class StudentManagementService {
  constructor(
    private loader: GraphLoader,
    private nodeMutation: NodeMutationService,
    private relMutation: RelationshipMutationService
  ) {}

  /**
   * Create a Student node in a course graph
   * Students are stored in the same graph as CourseSettings
   */
  async createStudent(
    mentorId: string,
    graphId: string,
    studentData: CreateStudentInput
  ): Promise<Student> {
    const graph = await this.loader.getGraph(mentorId, graphId);

    // Check if student already exists in this course graph
    const studentNodeId = `student-${studentData.userId}`;
    if (graph.nodes[studentNodeId]) {
      const existingNode = graph.nodes[studentNodeId];
      const props = existingNode.properties as StudentNodeProperties;
      return {
        id: props.id,
        userId: props.userId,
        name: props.name,
        email: props.email,
        phone: props.phone,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      };
    }

    // Create Student node
    const studentNode = createStudentNode(studentData.userId, {
      userId: studentData.userId,
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
    });

    // Add the node to the course graph
    await this.nodeMutation.createNode(mentorId, graphId, studentNode);

    const props = studentNode.properties as StudentNodeProperties;
    return {
      id: props.id,
      userId: props.userId,
      name: props.name,
      email: props.email,
      phone: props.phone,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  /**
   * Update a Student node
   */
  async updateStudent(
    mentorId: string,
    graphId: string,
    studentUserId: string,
    updates: UpdateStudentInput
  ): Promise<Student> {
    const graph = await this.loader.getGraph(mentorId, graphId);
    
    const studentNodeId = `student-${studentUserId}`;
    const existingNode = graph.nodes[studentNodeId];
    
    if (!existingNode) {
      throw new Error(`Student with userId ${studentUserId} not found in course graph ${graphId}`);
    }

    const props = existingNode.properties as StudentNodeProperties;
    const updatedProps: StudentNodeProperties = {
      ...props,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.nodeMutation.updateNode(mentorId, graphId, studentNodeId, {
      properties: updatedProps,
      updatedAt: Date.now(),
    });

    return {
      id: updatedProps.id,
      userId: updatedProps.userId,
      name: updatedProps.name,
      email: updatedProps.email,
      phone: updatedProps.phone,
      createdAt: updatedProps.createdAt,
      updatedAt: updatedProps.updatedAt,
    };
  }

  /**
   * Delete a Student node and all related relationships from a course graph
   */
  async deleteStudent(
    mentorId: string,
    graphId: string,
    studentUserId: string
  ): Promise<void> {
    const graph = await this.loader.getGraph(mentorId, graphId);
    
    const studentNodeId = `student-${studentUserId}`;
    const existingNode = graph.nodes[studentNodeId];
    
    if (!existingNode) {
      throw new Error(`Student with userId ${studentUserId} not found in course graph ${graphId}`);
    }

    // Delete all relationships involving this student
    const relationshipsToDelete = graph.relationships.filter(
      rel => rel.source === studentNodeId || rel.target === studentNodeId
    );

    for (const rel of relationshipsToDelete) {
      await this.relMutation.deleteRelationship(mentorId, graphId, rel.id);
    }

    // Remove from CourseSettings.enrolledStudentIds if enrolled
    const courseSettingsId = `course-settings-${graphId}`;
    const courseSettingsNode = graph.nodes[courseSettingsId];
    if (courseSettingsNode) {
      const props = courseSettingsNode.properties as any;
      if (props.enrolledStudentIds && props.enrolledStudentIds.includes(studentUserId)) {
        const updatedProps = {
          ...props,
          enrolledStudentIds: props.enrolledStudentIds.filter((id: string) => id !== studentUserId),
          updatedAt: Date.now(),
        };
        await this.nodeMutation.updateNode(mentorId, graphId, courseSettingsId, {
          properties: updatedProps,
          updatedAt: Date.now(),
        });
      }
    }

    // Delete the student node
    await this.nodeMutation.deleteNode(mentorId, graphId, studentNodeId);
  }

  /**
   * Get a student by userId from a course graph
   */
  async getStudent(
    mentorId: string,
    graphId: string,
    studentUserId: string
  ): Promise<Student | null> {
    try {
      const graph = await this.loader.getGraph(mentorId, graphId);
      const studentNodeId = `student-${studentUserId}`;
      const node = graph.nodes[studentNodeId];
      
      if (!node) {
        return null;
      }

      const props = node.properties as StudentNodeProperties;
      return {
        id: props.id,
        userId: props.userId,
        name: props.name,
        email: props.email,
        phone: props.phone,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all students for a course (from the course graph)
   */
  async getStudents(mentorId: string, graphId: string): Promise<Student[]> {
    try {
      const graph = await this.loader.getGraph(mentorId, graphId);
      const studentNodes = Object.values(graph.nodes).filter(
        node => node.type === 'Student'
      );

      return studentNodes.map(node => {
        const props = node.properties as StudentNodeProperties;
        return {
          id: props.id,
          userId: props.userId,
          name: props.name,
          email: props.email,
          phone: props.phone,
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
   * Enroll a student in a course
   * Creates/ensures Student node exists in course graph, updates CourseSettings.enrolledStudentIds,
   * and creates hasEnrolledStudent relationship
   */
  async enrollStudentInCourse(
    mentorId: string,
    graphId: string,
    studentUserId: string,
    studentData?: CreateStudentInput
  ): Promise<void> {
    const graph = await this.loader.getGraph(mentorId, graphId);
    const courseSettingsId = `course-settings-${graphId}`;
    const courseSettingsNode = graph.nodes[courseSettingsId];

    if (!courseSettingsNode) {
      throw new Error('Course settings not found. Course must be published first.');
    }

    const props = courseSettingsNode.properties as any;
    const enrolledStudentIds = props.enrolledStudentIds || [];

    // Check if already enrolled
    if (enrolledStudentIds.includes(studentUserId)) {
      return; // Already enrolled
    }

    // Ensure student node exists in this course graph
    const studentNodeId = `student-${studentUserId}`;
    let studentNode = graph.nodes[studentNodeId];
    
    if (!studentNode && studentData) {
      // Create student node if it doesn't exist and data is provided
      studentNode = createStudentNode(studentUserId, {
        userId: studentData.userId,
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
      });
      await this.nodeMutation.createNode(mentorId, graphId, studentNode);
    } else if (!studentNode) {
      throw new Error('Student node not found. Provide studentData to create it.');
    }

    // Add student to enrolled list
    const updatedProps = {
      ...props,
      enrolledStudentIds: [...enrolledStudentIds, studentUserId],
      updatedAt: Date.now(),
    };

    await this.nodeMutation.updateNode(mentorId, graphId, courseSettingsId, {
      properties: updatedProps,
      updatedAt: Date.now(),
    });

    // Create relationship from CourseSettings to Student (both in same graph)
    const relationship = createRelationship(
      courseSettingsId,
      studentNodeId,
      'hasEnrolledStudent',
      'forward'
    );

    await this.relMutation.createRelationship(mentorId, graphId, relationship);
  }

  /**
   * Unenroll a student from a course
   * Removes student from CourseSettings.enrolledStudentIds and deletes relationship
   */
  async unenrollStudentFromCourse(
    mentorId: string,
    graphId: string,
    studentUserId: string
  ): Promise<void> {
    const graph = await this.loader.getGraph(mentorId, graphId);
    const courseSettingsId = `course-settings-${graphId}`;
    const courseSettingsNode = graph.nodes[courseSettingsId];

    if (!courseSettingsNode) {
      throw new Error('Course settings not found');
    }

    const props = courseSettingsNode.properties as any;
    const enrolledStudentIds = props.enrolledStudentIds || [];

    // Check if enrolled
    if (!enrolledStudentIds.includes(studentUserId)) {
      return; // Not enrolled
    }

    // Remove student from enrolled list
    const updatedProps = {
      ...props,
      enrolledStudentIds: enrolledStudentIds.filter((id: string) => id !== studentUserId),
      updatedAt: Date.now(),
    };

    await this.nodeMutation.updateNode(mentorId, graphId, courseSettingsId, {
      properties: updatedProps,
      updatedAt: Date.now(),
    });

    // Delete relationship
    const studentNodeId = `student-${studentUserId}`;
    const relationship = graph.relationships.find(
      rel =>
        rel.source === courseSettingsId &&
        rel.target === studentNodeId &&
        rel.type === 'hasEnrolledStudent'
    );

    if (relationship) {
      await this.relMutation.deleteRelationship(mentorId, graphId, relationship.id);
    }
  }

  /**
   * Get enrolled students for a course (from the course graph)
   */
  async getEnrolledStudents(
    mentorId: string,
    graphId: string
  ): Promise<Student[]> {
    const graph = await this.loader.getGraph(mentorId, graphId);
    const courseSettingsId = `course-settings-${graphId}`;
    const courseSettingsNode = graph.nodes[courseSettingsId];

    if (!courseSettingsNode) {
      return [];
    }

    const props = courseSettingsNode.properties as any;
    const enrolledStudentIds = props.enrolledStudentIds || [];

    if (enrolledStudentIds.length === 0) {
      return [];
    }

    // Fetch student nodes from the same course graph
    const students: Student[] = [];
    
    for (const studentUserId of enrolledStudentIds) {
      const studentNodeId = `student-${studentUserId}`;
      const studentNode = graph.nodes[studentNodeId];
      
      if (studentNode && studentNode.type === 'Student') {
        const studentProps = studentNode.properties as StudentNodeProperties;
        students.push({
          id: studentProps.id,
          userId: studentProps.userId,
          name: studentProps.name,
          email: studentProps.email,
          phone: studentProps.phone,
          createdAt: studentProps.createdAt,
          updatedAt: studentProps.updatedAt,
        });
      }
    }

    return students;
  }
}
