/**
 * Tests for Graph Operation Streaming
 * 
 * Tests Server-Sent Events (SSE) streaming functionality for graph operations.
 */

import { Request, Response } from 'express';
import { progressiveExpandHandler } from '../../controllers/graphExpansionController';
import { explainConceptHandler } from '../../controllers/graphExplanationController';
import { generateGoalsHandler } from '../../controllers/graphGoalController';
import { customOperationHandler } from '../../controllers/graphCustomOperationController';
import { generateLayerPracticeHandler } from '../../controllers/graphLayerPracticeController';
import {
  createMockRequest,
  createMockResponse,
  createMockDecodedToken,
  setupFirebaseAdminMocks,
  resetAllMocks,
} from '../testUtils.helper';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

// Mock the graph operations service
jest.mock('../../services/graphOperations', () => {
  const mockProgressiveExpand = jest.fn();
  const mockExplain = jest.fn();
  const mockGenerateGoals = jest.fn();
  const mockCustomOperation = jest.fn();
  const mockGenerateLayerPractice = jest.fn();
  return {
    progressiveExpandMultipleFromText: mockProgressiveExpand,
    explain: mockExplain,
    generateGoals: mockGenerateGoals,
    customOperation: mockCustomOperation,
    generateLayerPractice: mockGenerateLayerPractice,
    __mocks: {
      mockProgressiveExpand,
      mockExplain,
      mockGenerateGoals,
      mockCustomOperation,
      mockGenerateLayerPractice,
    },
  };
});

// Mock the mutation service
jest.mock('../../services/graphMutationService', () => {
  const mockApplyMutationBatchSafe = jest.fn();
  return {
    GraphMutationService: jest.fn().mockImplementation(() => ({
      applyMutationBatchSafe: mockApplyMutationBatchSafe,
    })),
    __mocks: {
      mockApplyMutationBatchSafe,
    },
  };
});

// Mock the access layer
jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  const mockGetGraph = jest.fn();
  const mockSaveGraph = jest.fn();
  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
      getGraph: mockGetGraph,
      saveGraph: mockSaveGraph,
    })),
    __mocks: {
      mockGetGraph,
      mockSaveGraph,
    },
  };
});

// Mock the authorization service (used directly in graphExpansionController)
jest.mock('../../services/graphAuthorizationService', () => {
  const mockVerifyGraphAccess = jest.fn();
  return {
    GraphAuthorizationService: jest.fn().mockImplementation(() => ({
      verifyGraphAccess: mockVerifyGraphAccess,
    })),
    __mocks: {
      mockVerifyGraphAccess,
    },
  };
});

// Mock controller helpers
jest.mock('../../utils/controllerHelpers', () => {
  const actualHelpers = jest.requireActual('../../utils/controllerHelpers');
  const { mockGetGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;
  const { mockVerifyGraphAccess } = require('../../services/graphAuthorizationService').__mocks;
  
  return {
    ...actualHelpers,
    loadGraphForOperation: async (uid: string, graphId: string) => {
      const graph = await mockGetGraph(uid, graphId);
      if (!graph) {
        throw new Error(`Graph ${graphId} not found`);
      }
      return graph;
    },
    verifyGraphAccess: async (uid: string, graphId: string, operation: string) => {
      await mockVerifyGraphAccess(uid, graphId, operation);
    },
  };
});

// Mock stream handler
jest.mock('../../utils/graphOperationStreamHandler', () => {
  const mockHandleStream = jest.fn();
  return {
    handleGraphOperationStream: mockHandleStream,
    __mocks: {
      mockHandleStream,
    },
  };
});

// Mock parsers
jest.mock('../../utils/graphOperationParsers', () => {
  const mockParseProgressiveExpand = jest.fn();
  const mockParseExplain = jest.fn();
  const mockParseGenerateGoals = jest.fn();
  const mockParseCustomOperation = jest.fn();
  const mockParseGenerateLayerPractice = jest.fn();
  return {
    parseProgressiveExpandContent: mockParseProgressiveExpand,
    parseExplainContent: mockParseExplain,
    parseGenerateGoalsContent: mockParseGenerateGoals,
    parseCustomOperationContent: mockParseCustomOperation,
    parseGenerateLayerPracticeContent: mockParseGenerateLayerPractice,
    __mocks: {
      mockParseProgressiveExpand,
      mockParseExplain,
      mockParseGenerateGoals,
      mockParseCustomOperation,
      mockParseGenerateLayerPractice,
    },
  };
});

const {
  mockProgressiveExpand,
  mockExplain,
  mockGenerateGoals,
  mockCustomOperation,
  mockGenerateLayerPractice,
} = require('../../services/graphOperations').__mocks;

const { mockApplyMutationBatchSafe } = require('../../services/graphMutationService').__mocks;
const { mockGetGraph, mockSaveGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;
const { mockVerifyGraphAccess: mockAuthVerifyGraphAccess } = require('../../services/graphAuthorizationService').__mocks;
const { mockHandleStream } = require('../../utils/graphOperationStreamHandler').__mocks;
const { mockParseProgressiveExpand, mockParseExplain, mockParseGenerateGoals, mockParseCustomOperation, mockParseGenerateLayerPractice } = require('../../utils/graphOperationParsers').__mocks;

describe('Graph Operation Streaming', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';

  let sampleGraph: NodeBasedKnowledgeGraph;

  // Create a mock async iterable stream
  function createMockStream(content: string): AsyncIterable<any> {
    const chunks = content.split(' ').map(word => ({
      choices: [{ delta: { content: word + ' ' } }],
    }));

    return (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();
  }

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();

    // Create sample graph
    sampleGraph = {
      id: graphId,
      seedConceptId: nodeId1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId, name: 'Test Graph' }),
        [nodeId1]: createGraphNode(nodeId1, 'Concept', { id: nodeId1, name: 'React' }),
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [nodeId1],
        Layer: [],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
      relationships: [],
    };

    mockRequest = createMockRequest({
      firebaseUser: createMockDecodedToken({ uid }),
      params: { graphId },
    });

    mockResponse = createMockResponse();

    // Setup default mocks
    mockGetGraph.mockResolvedValue(sampleGraph);
    // Mock saveGraph to return the graph that was passed to it (simulating successful save)
    mockSaveGraph.mockImplementation(async (uid: string, graph: NodeBasedKnowledgeGraph, version?: number) => graph);
    mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => ({
      graph,
      errors: [],
    }));
    mockHandleStream.mockResolvedValue('full content');
    mockAuthVerifyGraphAccess.mockResolvedValue(undefined); // No error = access granted
  });

  describe('progressiveExpandHandler streaming', () => {
    it('should handle streaming when stream=true', async () => {
      const mockStream = createMockStream('test content');
      mockProgressiveExpand.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'true' };

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockProgressiveExpand).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
      expect(mockHandleStream).toHaveBeenCalled();
      expect(mockHandleStream).toHaveBeenCalledWith(
        mockStream,
        mockRequest,
        mockResponse,
        expect.objectContaining({
          onComplete: expect.any(Function),
          errorMessage: 'Failed to expand graph',
        })
      );
    });

    it('should call parser onComplete when streaming finishes', async () => {
      const mockStream = createMockStream('test content');
      mockProgressiveExpand.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      const mockParseResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'progressiveExpand', timestamp: Date.now() },
        },
        parsedContent: {
          narrative: 'test content',
          concepts: [],
        },
      };

      mockParseProgressiveExpand.mockResolvedValue(mockParseResult);

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'true' };

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      // Get the onComplete function that was passed to handleStream
      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      expect(streamCall).toBeDefined();
      expect(streamCall.length).toBeGreaterThan(3);
      const onComplete = streamCall[3]?.onComplete;
      expect(onComplete).toBeDefined();

      // Call onComplete to verify it works
      const result = await onComplete('test content');

      expect(mockParseProgressiveExpand).toHaveBeenCalledWith(
        'test content',
        sampleGraph,
        expect.any(Object),
        undefined,
        5
      );
      expect(result.mutations).toEqual(mockParseResult.mutations);
      expect(result.content).toEqual(mockParseResult.parsedContent);
    });

    it('should throw error when seed concept is missing', async () => {
      const mockStream = createMockStream('test content');
      mockProgressiveExpand.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      // Create a graph without seedConceptId
      const graphWithoutSeed = {
        ...sampleGraph,
        seedConceptId: undefined as any,
      };
      mockGetGraph.mockResolvedValueOnce(graphWithoutSeed);

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'true' };

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      // Get the onComplete function
      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      const onComplete = streamCall[3]?.onComplete;

      // Mock parser to throw error when seed concept is missing
      mockParseProgressiveExpand.mockRejectedValue(
        new Error('Seed concept not found - graph does not have a seedConceptId. Cannot create layer without a seed concept.')
      );

      // Call onComplete - should propagate the error
      await expect(onComplete('test content')).rejects.toThrow(
        'Seed concept not found - graph does not have a seedConceptId. Cannot create layer without a seed concept.'
      );
    });

    it('should throw error when seed concept node does not exist', async () => {
      const mockStream = createMockStream('test content');
      mockProgressiveExpand.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      // Create a graph with seedConceptId but the node doesn't exist
      const graphWithInvalidSeed = {
        ...sampleGraph,
        seedConceptId: 'non-existent-concept-id',
      };
      mockGetGraph.mockResolvedValueOnce(graphWithInvalidSeed);

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'true' };

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      // Get the onComplete function
      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      const onComplete = streamCall[3]?.onComplete;

      // Mock parser to throw error when seed concept node doesn't exist
      mockParseProgressiveExpand.mockRejectedValue(
        new Error('Seed concept non-existent-concept-id not found in graph nodes or is not a Concept node')
      );

      // Call onComplete - should propagate the error
      await expect(onComplete('test content')).rejects.toThrow(
        'Seed concept non-existent-concept-id not found in graph nodes or is not a Concept node'
      );
    });
  });

  describe('explainConceptHandler streaming', () => {
    it('should handle streaming when stream=true', async () => {
      const mockStream = createMockStream('lesson content');
      mockExplain.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      (mockRequest as any).body = { targetNodeId: nodeId1 };
      (mockRequest as any).query = { stream: 'true' };

      await explainConceptHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockExplain).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
      expect(mockHandleStream).toHaveBeenCalled();
    });

    it('should call parser onComplete when streaming finishes', async () => {
      const mockStream = createMockStream('lesson content');
      mockExplain.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      const mockParseResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'explain', timestamp: Date.now() },
        },
        parsedContent: {
          lesson: 'lesson content',
          prerequisites: [],
        },
      };

      mockParseExplain.mockResolvedValue(mockParseResult);

      (mockRequest as any).body = { targetNodeId: nodeId1 };
      (mockRequest as any).query = { stream: 'true' };

      await explainConceptHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      // Get the onComplete function
      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      expect(streamCall).toBeDefined();
      expect(streamCall.length).toBeGreaterThan(3);
      const onComplete = streamCall[3]?.onComplete;
      expect(onComplete).toBeDefined();

      const result = await onComplete('lesson content');

      expect(mockParseExplain).toHaveBeenCalledWith(
        'lesson content',
        sampleGraph,
        expect.any(Object),
        nodeId1
      );
      expect(result.mutations).toEqual(mockParseResult.mutations);
      expect(result.content).toEqual(mockParseResult.parsedContent);
    });
  });

  describe('generateGoalsHandler streaming', () => {
    it('should handle streaming when stream=true', async () => {
      const mockStream = createMockStream('{"title":"Learn React","description":"Master React fundamentals","type":"skill","target":"build apps"}');
      mockGenerateGoals.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      (mockRequest as any).body = {
        anchorAnswer: 'I want to learn React',
        questionAnswers: [],
      };
      (mockRequest as any).query = { stream: 'true' };

      await generateGoalsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGenerateGoals).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
      expect(mockHandleStream).toHaveBeenCalled();
      expect(mockHandleStream).toHaveBeenCalledWith(
        mockStream,
        mockRequest,
        mockResponse,
        expect.objectContaining({
          onComplete: expect.any(Function),
          errorMessage: 'Failed to generate goals',
        })
      );
    });

    it('should call parser onComplete when streaming finishes', async () => {
      const mockStream = createMockStream('{"title":"Learn React","description":"Master React","type":"skill","target":"build apps"}');
      mockGenerateGoals.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      const goalNodeId = 'goal-1';
      const mockParseResult = {
        mutations: {
          mutations: [
            {
              type: 'create_node',
              node: {
                id: goalNodeId,
                type: 'LearningGoal',
                properties: {
                  title: 'Learn React',
                  description: 'Master React',
                  type: 'skill',
                  target: 'build apps',
                },
              },
            },
          ],
          metadata: { operation: 'generateGoals', timestamp: Date.now() },
        },
        parsedContent: {
          goal: {
            id: goalNodeId,
            graphId,
            title: 'Learn React',
            description: 'Master React',
            type: 'skill',
            target: 'build apps',
            milestones: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      };

      mockParseGenerateGoals.mockResolvedValue(mockParseResult);
      mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => {
        // Simulate applying mutations - add goal node to graph
        const updatedGraph = {
          ...graph,
          nodes: {
            ...graph.nodes,
            [goalNodeId]: {
              id: goalNodeId,
              type: 'LearningGoal',
              properties: mockParseResult.parsedContent.goal,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
          nodeTypes: {
            ...graph.nodeTypes,
            LearningGoal: [goalNodeId],
          },
        };
        return { graph: updatedGraph, errors: [] };
      });

      (mockRequest as any).body = {
        anchorAnswer: 'I want to learn React',
        questionAnswers: [],
      };
      (mockRequest as any).query = { stream: 'true' };

      await generateGoalsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      // Get the onComplete function
      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      expect(streamCall).toBeDefined();
      expect(streamCall.length).toBeGreaterThan(3);
      const onComplete = streamCall[3]?.onComplete;
      expect(onComplete).toBeDefined();

      const fullContent = '{"title":"Learn React","description":"Master React","type":"skill","target":"build apps"}';
      const result = await onComplete(fullContent);

      expect(mockParseGenerateGoals).toHaveBeenCalledWith(
        fullContent,
        sampleGraph,
        expect.any(Object),
        'I want to learn React', // anchorAnswer should be passed
        undefined // manualGoal is not set
      );
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      expect(result.mutations).toEqual(mockParseResult.mutations);
      expect(result.content).toEqual(mockParseResult.parsedContent);
      expect(result.graph).toBeDefined();
      expect(result.graph.nodeTypes.LearningGoal).toContain(goalNodeId);
    });

    it('should create seed concept when graph does not have one', async () => {
      const mockStream = createMockStream('{"title":"Learn React","description":"Master React","type":"skill","target":"build apps"}');
      mockGenerateGoals.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      // Create a graph without seedConceptId
      const graphWithoutSeed = {
        ...sampleGraph,
        seedConceptId: '',
      };

      mockGetGraph.mockResolvedValueOnce(graphWithoutSeed);

      const goalNodeId = 'goal-1';
      const seedConceptId = 'seed-concept-1';
      const mockParseResult = {
        mutations: {
          mutations: [
            {
              type: 'create_node',
              node: {
                id: seedConceptId,
                type: 'Concept',
                properties: {
                  name: 'I want to learn React',
                  description: 'Master React',
                  isSeed: true,
                  goal: 'Learn React: Master React',
                },
              },
            },
            {
              type: 'create_node',
              node: {
                id: goalNodeId,
                type: 'LearningGoal',
                properties: {
                  title: 'Learn React',
                  description: 'Master React',
                  type: 'skill',
                  target: 'build apps',
                },
              },
            },
          ],
          metadata: { operation: 'generateGoals', timestamp: Date.now() },
        },
        parsedContent: {
          goal: {
            id: goalNodeId,
            graphId,
            title: 'Learn React',
            description: 'Master React',
            type: 'skill',
            target: 'build apps',
            milestones: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        seedConceptId,
      };

      mockParseGenerateGoals.mockResolvedValue(mockParseResult);
      mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => {
        // Simulate applying mutations - add seed concept and goal node to graph
        const updatedGraph = {
          ...graph,
          seedConceptId: seedConceptId, // Set seedConceptId
          nodes: {
            ...graph.nodes,
            [seedConceptId]: {
              id: seedConceptId,
              type: 'Concept',
              properties: {
                name: 'I want to learn React',
                description: 'Master React',
                isSeed: true,
                goal: 'Learn React: Master React',
              },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            [goalNodeId]: {
              id: goalNodeId,
              type: 'LearningGoal',
              properties: mockParseResult.parsedContent.goal,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
          nodeTypes: {
            ...graph.nodeTypes,
            Concept: [seedConceptId],
            LearningGoal: [goalNodeId],
          },
        };
        return { graph: updatedGraph, errors: [] };
      });

      (mockRequest as any).body = {
        anchorAnswer: 'I want to learn React',
        questionAnswers: [],
      };
      (mockRequest as any).query = { stream: 'true' };

      await generateGoalsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      // Get the onComplete function
      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      const onComplete = streamCall[3]?.onComplete;

      const fullContent = '{"title":"Learn React","description":"Master React","type":"skill","target":"build apps"}';
      const result = await onComplete(fullContent);

      // Verify seed concept was created
      expect(mockParseGenerateGoals).toHaveBeenCalledWith(
        fullContent,
        graphWithoutSeed,
        expect.any(Object),
        'I want to learn React',
        undefined // manualGoal is not set
      );
      
      // Verify seed concept node was created in mutations
      const mutations = mockApplyMutationBatchSafe.mock.calls[0][1];
      const seedConceptMutation = mutations.mutations.find(
        (m: any) => m.type === 'create_node' && m.node.type === 'Concept' && m.node.properties.isSeed === true
      );
      expect(seedConceptMutation).toBeDefined();
      expect(seedConceptMutation.node.id).toBe(seedConceptId);
      expect(seedConceptMutation.node.properties.name).toBe('I want to learn React');

      // Verify seedConceptId was set on the graph
      expect(result.graph.seedConceptId).toBe(seedConceptId);
      expect(result.graph.nodes[seedConceptId]).toBeDefined();
      expect(result.graph.nodeTypes.Concept).toContain(seedConceptId);
    });

    it('should not create seed concept if graph already has one', async () => {
      const mockStream = createMockStream('{"title":"Learn React","description":"Master React","type":"skill","target":"build apps"}');
      mockGenerateGoals.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      // Create a graph with existing seedConceptId
      const existingSeedConceptId = 'existing-seed-1';
      const graphWithSeed = {
        ...sampleGraph,
        seedConceptId: existingSeedConceptId,
        nodes: {
          ...sampleGraph.nodes,
          [existingSeedConceptId]: {
            id: existingSeedConceptId,
            type: 'Concept',
            properties: {
              name: 'Existing Seed',
              description: 'Existing seed concept',
              isSeed: true,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        nodeTypes: {
          ...sampleGraph.nodeTypes,
          Concept: [existingSeedConceptId],
        },
      };

      mockGetGraph.mockResolvedValueOnce(graphWithSeed);

      const goalNodeId = 'goal-1';
      const mockParseResult = {
        mutations: {
          mutations: [
            {
              type: 'create_node',
              node: {
                id: goalNodeId,
                type: 'LearningGoal',
                properties: {
                  title: 'Learn React',
                  description: 'Master React',
                  type: 'skill',
                  target: 'build apps',
                },
              },
            },
          ],
          metadata: { operation: 'generateGoals', timestamp: Date.now() },
        },
        parsedContent: {
          goal: {
            id: goalNodeId,
            graphId,
            title: 'Learn React',
            description: 'Master React',
            type: 'skill',
            target: 'build apps',
            milestones: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        seedConceptId: undefined, // Should not return seedConceptId if already exists
      };

      mockParseGenerateGoals.mockResolvedValue(mockParseResult);
      mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => {
        const updatedGraph = {
          ...graph,
          nodes: {
            ...graph.nodes,
            [goalNodeId]: {
              id: goalNodeId,
              type: 'LearningGoal',
              properties: mockParseResult.parsedContent.goal,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
          nodeTypes: {
            ...graph.nodeTypes,
            LearningGoal: [goalNodeId],
          },
        };
        return { graph: updatedGraph, errors: [] };
      });

      (mockRequest as any).body = {
        anchorAnswer: 'I want to learn React',
        questionAnswers: [],
      };
      (mockRequest as any).query = { stream: 'true' };

      await generateGoalsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      // Get the onComplete function
      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      const onComplete = streamCall[3]?.onComplete;

      const fullContent = '{"title":"Learn React","description":"Master React","type":"skill","target":"build apps"}';
      const result = await onComplete(fullContent);

      // Verify seed concept was NOT created (graph already has one)
      const mutations = mockApplyMutationBatchSafe.mock.calls[0][1];
      const seedConceptMutations = mutations.mutations.filter(
        (m: any) => m.type === 'create_node' && m.node.type === 'Concept' && m.node.properties.isSeed === true
      );
      expect(seedConceptMutations.length).toBe(0);

      // Verify existing seedConceptId was preserved
      expect(result.graph.seedConceptId).toBe(existingSeedConceptId);
      expect(result.graph.nodes[existingSeedConceptId]).toBeDefined();
    });
  });

  describe('customOperationHandler streaming', () => {
    it('should handle streaming when stream=true', async () => {
      const mockStream = createMockStream('[{"name":"New Concept","description":"A new concept","parents":[],"children":[]}]');
      mockCustomOperation.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      (mockRequest as any).body = {
        targetNodeIds: [nodeId1],
        userPrompt: 'Add a new concept',
      };
      (mockRequest as any).query = { stream: 'true' };

      await customOperationHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockCustomOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
      expect(mockHandleStream).toHaveBeenCalled();
    });

    it('should call parser onComplete when streaming finishes', async () => {
      const mockStream = createMockStream('[{"name":"New Concept","description":"A concept","parents":[],"children":[]}]');
      mockCustomOperation.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      const mockParseResult = {
        mutations: {
          mutations: [
            {
              type: 'create_node',
              node: {
                id: 'concept-new',
                type: 'Concept',
                properties: {
                  name: 'New Concept',
                  description: 'A concept',
                },
              },
            },
          ],
          metadata: { operation: 'customOperation', timestamp: Date.now() },
        },
        parsedContent: {
          concepts: [{ name: 'New Concept', action: 'added' }],
        },
      };

      mockParseCustomOperation.mockResolvedValue(mockParseResult);
      mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => {
        const updatedGraph = {
          ...graph,
          nodes: {
            ...graph.nodes,
            'concept-new': {
              id: 'concept-new',
              type: 'Concept',
              properties: { name: 'New Concept', description: 'A concept' },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
          nodeTypes: {
            ...graph.nodeTypes,
            Concept: [...graph.nodeTypes.Concept, 'concept-new'],
          },
        };
        return { graph: updatedGraph, errors: [] };
      });

      (mockRequest as any).body = {
        targetNodeIds: [nodeId1],
        userPrompt: 'Add a new concept',
      };
      (mockRequest as any).query = { stream: 'true' };

      await customOperationHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      const onComplete = streamCall[3]?.onComplete;
      expect(onComplete).toBeDefined();

      const fullContent = '[{"name":"New Concept","description":"A concept","parents":[],"children":[]}]';
      const result = await onComplete(fullContent);

      expect(mockParseCustomOperation).toHaveBeenCalledWith(
        fullContent,
        sampleGraph,
        expect.any(Object),
        expect.any(Array)
      );
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      expect(result.mutations).toEqual(mockParseResult.mutations);
      expect(result.content).toEqual(mockParseResult.parsedContent);
    });
  });

  describe('generateLayerPracticeHandler streaming', () => {
    it('should handle streaming when stream=true', async () => {
      const mockStream = createMockStream('# Layer 1 Review\n\nPractice content...');
      mockGenerateLayerPractice.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      // Add a layer node to the graph with relationships to concepts
      const layerNode = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        layerNumber: 1,
        goal: 'Learn basics',
      });
      const graphWithLayer = {
        ...sampleGraph,
        nodes: {
          ...sampleGraph.nodes,
          'layer-1': layerNode,
        },
        nodeTypes: {
          ...sampleGraph.nodeTypes,
          Layer: ['layer-1'],
        },
        relationships: [
          ...sampleGraph.relationships,
          createRelationship('layer-1', nodeId1, 'containsConcept', 'forward', 1.0),
        ],
      };
      mockGetGraph.mockResolvedValue(graphWithLayer);

      (mockRequest as any).body = { layerNumber: 1 };
      (mockRequest as any).query = { stream: 'true' };

      await generateLayerPracticeHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGenerateLayerPractice).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
      expect(mockHandleStream).toHaveBeenCalled();
    });

    it('should call parser onComplete when streaming finishes', async () => {
      const mockStream = createMockStream('# Layer 1 Review\n\nPractice content...');
      mockGenerateLayerPractice.mockResolvedValue({
        stream: mockStream,
        model: 'test-model',
      });

      // Add a layer node to the graph with relationships to concepts
      const layerNode = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        layerNumber: 1,
        goal: 'Learn basics',
      });
      const graphWithLayer = {
        ...sampleGraph,
        nodes: {
          ...sampleGraph.nodes,
          'layer-1': layerNode,
        },
        nodeTypes: {
          ...sampleGraph.nodeTypes,
          Layer: ['layer-1'],
        },
        relationships: [
          ...sampleGraph.relationships,
          createRelationship('layer-1', nodeId1, 'containsConcept', 'forward', 1.0),
        ],
      };
      mockGetGraph.mockResolvedValue(graphWithLayer);

      const practiceNodeId = 'practice-1';
      const mockParseResult = {
        mutations: {
          mutations: [
            {
              type: 'create_node',
              node: {
                id: practiceNodeId,
                type: 'PracticeExercise',
                properties: {
                  type: 'project',
                  question: '# Layer 1 Review\n\nPractice content...',
                  answer: '',
                },
              },
            },
          ],
          metadata: { operation: 'generateLayerPractice', timestamp: Date.now() },
        },
        parsedContent: {
          review: '# Layer 1 Review\n\nPractice content...',
        },
      };

      mockParseGenerateLayerPractice.mockResolvedValue(mockParseResult);
      mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => {
        const updatedGraph = {
          ...graph,
          nodes: {
            ...graph.nodes,
            [practiceNodeId]: {
              id: practiceNodeId,
              type: 'PracticeExercise',
              properties: mockParseResult.mutations.mutations[0].node.properties,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
          nodeTypes: {
            ...graph.nodeTypes,
            PracticeExercise: [practiceNodeId],
          },
        };
        return { graph: updatedGraph, errors: [] };
      });

      (mockRequest as any).body = { layerNumber: 1 };
      (mockRequest as any).query = { stream: 'true' };

      await generateLayerPracticeHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockHandleStream).toHaveBeenCalled();
      const streamCall = mockHandleStream.mock.calls[0];
      const onComplete = streamCall[3]?.onComplete;
      expect(onComplete).toBeDefined();

      const fullContent = '# Layer 1 Review\n\nPractice content...';
      const result = await onComplete(fullContent);

      expect(mockParseGenerateLayerPractice).toHaveBeenCalledWith(
        fullContent,
        graphWithLayer,
        expect.any(Object),
        1
      );
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      expect(result.mutations).toEqual(mockParseResult.mutations);
      expect(result.content).toEqual(mockParseResult.parsedContent);
    });
  });
});

