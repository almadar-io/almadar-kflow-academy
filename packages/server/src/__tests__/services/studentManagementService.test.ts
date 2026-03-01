/**
 * Unit Tests for Student Management Service
 * 
 * Tests StudentManagementService CRUD operations and enrollment management
 */

import { GraphCacheManager } from '../../services/knowledgeGraphAccess/core/GraphCacheManager';
import { GraphLoader } from '../../services/knowledgeGraphAccess/core/GraphLoader';
import { NodeMutationService } from '../../services/knowledgeGraphAccess/mutation/NodeMutationService';
import { RelationshipMutationService } from '../../services/knowledgeGraphAccess/mutation/RelationshipMutationService';
import { StudentManagementService } from '../../services/studentManagementService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createEmptyNodeTypeIndex } from '../../types/nodeBasedKnowledgeGraph';

// Mock Firebase Admin
jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

// Mock knowledgeGraphService
jest.mock('../../services/knowledgeGraphService');

import {
  getNodeBasedKnowledgeGraph,
  saveNodeBasedKnowledgeGraph,
} from '../../services/knowledgeGraphService';

const mockGetGraph = getNodeBasedKnowledgeGraph as jest.MockedFunction<typeof getNodeBasedKnowledgeGraph>;
const mockSaveGraph = saveNodeBasedKnowledgeGraph as jest.MockedFunction<typeof saveNodeBasedKnowledgeGraph>;

describe('StudentManagementService', () => {
  let cacheManager: GraphCacheManager;
  let loader: GraphLoader;
  let nodeMutation: NodeMutationService;
  let relMutation: RelationshipMutationService;
  let studentService: StudentManagementService;

  const mockMentorId = 'mentor-123';
  const mockGraphId = 'course-graph-123';
  const mockStudentUserId = 'student-456';
  
  // Use unique graph IDs per test to avoid cache conflicts
  let testGraphIdCounter = 0;
  const getUniqueGraphId = () => `course-graph-${++testGraphIdCounter}`;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to ensure clean state for each test
    mockGetGraph.mockReset();
    mockSaveGraph.mockReset();

    // Create fresh cache manager and loader for each test
    // Note: The underlying cache is shared, so we use unique graph IDs per test
    cacheManager = new GraphCacheManager();
    loader = new GraphLoader(cacheManager);
    nodeMutation = new NodeMutationService(loader);
    relMutation = new RelationshipMutationService(loader);
    studentService = new StudentManagementService(loader, nodeMutation, relMutation);
  });

  describe('createStudent', () => {
    it('should create a new student node in course graph', async () => {
      const emptyGraph: NodeBasedKnowledgeGraph = {
        id: mockGraphId,
        seedConceptId: 'seed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {},
        relationships: [],
        nodeTypes: createEmptyNodeTypeIndex(),
      };

      mockGetGraph.mockResolvedValueOnce(emptyGraph);
      mockGetGraph.mockResolvedValueOnce(emptyGraph);
      mockSaveGraph.mockResolvedValue(emptyGraph as any);

      const studentData = {
        userId: mockStudentUserId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
      };

      const result = await studentService.createStudent(mockMentorId, mockGraphId, studentData);

      expect(result.userId).toBe(mockStudentUserId);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('123-456-7890');
      expect(mockSaveGraph).toHaveBeenCalled();
    });

    it('should return existing student if already exists in course graph', async () => {
      const existingStudentNode = createGraphNode(`student-${mockStudentUserId}`, 'Student', {
        id: `student-${mockStudentUserId}`,
        userId: mockStudentUserId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: mockGraphId,
        seedConceptId: 'seed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [existingStudentNode.id]: existingStudentNode,
        },
        relationships: [],
        nodeTypes: {
          ...createEmptyNodeTypeIndex(),
          Student: [existingStudentNode.id],
        },
      };

      mockGetGraph.mockResolvedValueOnce(graph);

      const studentData = {
        userId: mockStudentUserId,
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
      };

      const result = await studentService.createStudent(mockMentorId, mockGraphId, studentData);

      expect(result.userId).toBe(mockStudentUserId);
      expect(result.name).toBe('John Doe'); // Should return existing, not updated
      expect(mockSaveGraph).not.toHaveBeenCalled();
    });
  });

  describe('getStudents', () => {
    it('should return all students for a course', async () => {
      const testGraphId = getUniqueGraphId();
      const student1 = createGraphNode('student-user-1', 'Student', {
        id: 'student-user-1',
        userId: 'user-1',
        name: 'Student One',
        email: 'student1@example.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const student2 = createGraphNode('student-user-2', 'Student', {
        id: 'student-user-2',
        userId: 'user-2',
        name: 'Student Two',
        email: 'student2@example.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: testGraphId,
        seedConceptId: 'seed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [student1.id]: student1,
          [student2.id]: student2,
        },
        relationships: [],
        nodeTypes: {
          ...createEmptyNodeTypeIndex(),
          Student: [student1.id, student2.id],
        },
      };

      // Reset and set up mock for this specific test
      mockGetGraph.mockReset();
      mockGetGraph.mockImplementation(async () => graph);

      const result = await studentService.getStudents(mockMentorId, testGraphId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Student One');
      expect(result[1].name).toBe('Student Two');
    });

    it('should return empty array if graph does not exist', async () => {
      const testGraphId = getUniqueGraphId();
      // Reset and set up mock for this specific test
      mockGetGraph.mockReset();
      mockGetGraph.mockRejectedValue(new Error('Graph not found'));

      const result = await studentService.getStudents(mockMentorId, testGraphId);

      expect(result).toEqual([]);
      expect(mockGetGraph).toHaveBeenCalledWith(mockMentorId, testGraphId);
    });
  });

  describe('enrollStudentInCourse', () => {
    it('should enroll a student in a course', async () => {
      const courseSettingsId = `course-settings-${mockGraphId}`;
      const studentNodeId = `student-${mockStudentUserId}`;
      
      const courseSettingsNode = createGraphNode(courseSettingsId, 'CourseSettings', {
        id: courseSettingsId,
        title: 'Test Course',
        description: 'Test Description',
        visibility: 'private',
        isPublished: true,
        enrollmentEnabled: true,
        enrolledStudentIds: [],
        enrolledMentorId: mockMentorId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const studentNode = createGraphNode(studentNodeId, 'Student', {
        id: studentNodeId,
        userId: mockStudentUserId,
        name: 'Test Student',
        email: 'test@example.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Initial graph with course settings only
      const initialGraph: NodeBasedKnowledgeGraph = {
        id: mockGraphId,
        seedConceptId: 'seed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [courseSettingsId]: courseSettingsNode,
        },
        relationships: [],
        nodeTypes: {
          ...createEmptyNodeTypeIndex(),
          CourseSettings: [courseSettingsId],
        },
      };

      // Graph after student node is created
      const graphWithStudent: NodeBasedKnowledgeGraph = {
        ...initialGraph,
        nodes: {
          ...initialGraph.nodes,
          [studentNodeId]: studentNode,
        },
        nodeTypes: {
          ...initialGraph.nodeTypes,
          Student: [studentNodeId],
        },
      };

      // Graph after course settings updated with enrolled student
      const graphWithEnrollment: NodeBasedKnowledgeGraph = {
        ...graphWithStudent,
        nodes: {
          ...graphWithStudent.nodes,
          [courseSettingsId]: {
            ...courseSettingsNode,
            properties: {
              ...courseSettingsNode.properties,
              enrolledStudentIds: [mockStudentUserId],
            },
          },
        },
      };

      // Set up mock for this specific test - ensure first call returns initialGraph
      mockGetGraph.mockReset();
      // Use mockImplementation to track calls and return appropriate graph
      let callCount = 0;
      mockGetGraph.mockImplementation(async () => {
        callCount++;
        // First call should return initialGraph with course settings
        if (callCount === 1) {
          return initialGraph;
        }
        // Second call (after student creation) should return graphWithStudent
        if (callCount === 2) {
          return graphWithStudent;
        }
        // All subsequent calls return graphWithEnrollment
        return graphWithEnrollment;
      });
      
      mockSaveGraph.mockReset();
      mockSaveGraph.mockResolvedValue(graphWithEnrollment as any);

      const studentData = {
        userId: mockStudentUserId,
        name: 'Test Student',
        email: 'test@example.com',
      };

      await studentService.enrollStudentInCourse(mockMentorId, mockGraphId, mockStudentUserId, studentData);

      expect(mockGetGraph).toHaveBeenCalledWith(mockMentorId, mockGraphId);
      expect(mockSaveGraph).toHaveBeenCalled();
    });

    it('should throw error if course settings not found', async () => {
      const testGraphId = getUniqueGraphId();
      const courseGraph: NodeBasedKnowledgeGraph = {
        id: testGraphId,
        seedConceptId: 'seed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {},
        relationships: [],
        nodeTypes: createEmptyNodeTypeIndex(),
      };

      mockGetGraph.mockReset();
      mockGetGraph.mockResolvedValueOnce(courseGraph);

      await expect(
        studentService.enrollStudentInCourse(mockMentorId, testGraphId, mockStudentUserId)
      ).rejects.toThrow('Course settings not found');
    });
  });
});
