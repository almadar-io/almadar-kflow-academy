/**
 * Integration Tests for Graph Operation Controllers
 * 
 * Tests REST API endpoints for graph operations (expansion, explanation, goals, etc.)
 */

import { Request, Response } from 'express';
import {
  progressiveExpandHandler,
} from '../../controllers/graphExpansionController';
import {
  explainConceptHandler,
  answerQuestionHandler,
} from '../../controllers/graphExplanationController';
import { generateGoalsHandler } from '../../controllers/graphGoalController';
import { generateLayerPracticeHandler } from '../../controllers/graphLayerPracticeController';
import { customOperationHandler } from '../../controllers/graphCustomOperationController';
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
  const mockAnswerQuestion = jest.fn();
  const mockGenerateGoals = jest.fn();
  const mockGenerateLayerPractice = jest.fn();
  const mockCustomOperation = jest.fn();

  return {
    progressiveExpandMultipleFromText: mockProgressiveExpand,
    explain: mockExplain,
    answerQuestion: mockAnswerQuestion,
    generateGoals: mockGenerateGoals,
    generateLayerPractice: mockGenerateLayerPractice,
    customOperation: mockCustomOperation,
    __mocks: {
      mockProgressiveExpand,
      mockExplain,
      mockAnswerQuestion,
      mockGenerateGoals,
      mockGenerateLayerPractice,
      mockCustomOperation,
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

// Mock the authorization service
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

const { mockGetGraph, mockSaveGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

const {
  mockProgressiveExpand,
  mockExplain,
  mockAnswerQuestion,
  mockGenerateGoals,
  mockGenerateLayerPractice,
  mockCustomOperation,
} = require('../../services/graphOperations').__mocks;

const { mockApplyMutationBatchSafe } = require('../../services/graphMutationService').__mocks;
const { mockVerifyGraphAccess } = require('../../services/graphAuthorizationService').__mocks;
const { mockHandleStream } = require('../../utils/graphOperationStreamHandler').__mocks;

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
  const mockParseGenerateGoals = jest.fn();
  return {
    parseGenerateGoalsContent: mockParseGenerateGoals,
    __mocks: {
      mockParseGenerateGoals,
    },
  };
});

// Mock controller helpers to use the mocked access layer
jest.mock('../../utils/controllerHelpers', () => {
  const actualHelpers = jest.requireActual('../../utils/controllerHelpers');
  const { mockGetGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;
  
  return {
    ...actualHelpers,
    loadGraphForOperation: async (uid: string, graphId: string) => {
      const graph = await mockGetGraph(uid, graphId);
      if (!graph) {
        throw new Error(`Graph ${graphId} not found`);
      }
      return graph;
    },
  };
});

describe('Graph Operation Controllers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';
  const nodeId2 = 'concept-2';

  let sampleGraph: NodeBasedKnowledgeGraph;

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
        [nodeId2]: createGraphNode(nodeId2, 'Concept', { id: nodeId2, name: 'JavaScript' }),
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [nodeId1, nodeId2],
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
    mockVerifyGraphAccess.mockResolvedValue(undefined); // No error = access granted
    mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => ({
      graph,
      errors: [],
    }));
    mockHandleStream.mockResolvedValue('full content');
  });

  describe('progressiveExpandHandler', () => {
    it('should expand graph successfully', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'progressiveExpand', timestamp: Date.now() } },
        content: {
          narrative: 'Expanded graph',
          concepts: [{ name: 'New Concept', description: 'A new concept', parents: [] }],
        },
      };

      mockProgressiveExpand.mockResolvedValue(mockResult);

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'false' }; // Explicitly set stream to false

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockProgressiveExpand).toHaveBeenCalled();
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      // Get the saved graph from the mock call (should be the graph passed to saveGraph)
      const savedGraphCall = mockSaveGraph.mock.calls[0];
      const savedGraph = savedGraphCall ? savedGraphCall[1] : sampleGraph;
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mutations: mockResult.mutations,
          content: mockResult.content,
          graph: savedGraph || sampleGraph,
        })
      );
    });

    it('should handle unauthorized requests', async () => {
      (mockRequest as any).firebaseUser = undefined;

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle errors', async () => {
      mockGetGraph.mockRejectedValue(new Error('Graph not found'));

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Failed to expand graph') })
      );
    });
  });

  describe('explainConceptHandler', () => {
    it('should explain concept successfully', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'explain', timestamp: Date.now() } },
        content: {
          lesson: 'React is a JavaScript library',
          prerequisites: [],
        },
      };

      mockExplain.mockResolvedValue(mockResult);
      (mockRequest as any).body = { targetNodeId: nodeId1 };
      (mockRequest as any).query = { stream: 'false' };

      await explainConceptHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockExplain).toHaveBeenCalled();
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      // Get the saved graph from the mock call (should be the graph passed to saveGraph)
      const savedGraphCall = mockSaveGraph.mock.calls[0];
      const savedGraph = savedGraphCall ? savedGraphCall[1] : sampleGraph;
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mutations: mockResult.mutations,
          content: mockResult.content,
          graph: savedGraph || sampleGraph,
        })
      );
    });

    it('should return 400 if targetNodeId is missing', async () => {
      (mockRequest as any).body = {};

      await explainConceptHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'targetNodeId is required' });
    });

    it('should return 404 if concept not found', async () => {
      const graphWithoutConcept = {
        ...sampleGraph,
        nodes: { [graphId]: sampleGraph.nodes[graphId] },
      };
      mockGetGraph.mockResolvedValue(graphWithoutConcept);
      (mockRequest as any).body = { targetNodeId: nodeId1 };

      await explainConceptHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('not found') })
      );
    });
  });

  describe('answerQuestionHandler', () => {
    it('should answer question successfully', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'answerQuestion', timestamp: Date.now() } },
        content: {
          answer: 'React is a library for building user interfaces',
        },
      };

      mockAnswerQuestion.mockResolvedValue(mockResult);
      (mockRequest as any).body = { targetNodeId: nodeId1, question: 'What is React?' };
      (mockRequest as any).query = { stream: 'false' };

      await answerQuestionHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockAnswerQuestion).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mutations: mockResult.mutations,
          content: mockResult.content,
        })
      );
    });

    it('should return 400 if required fields are missing', async () => {
      (mockRequest as any).body = { targetNodeId: nodeId1 };

      await answerQuestionHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        { error: 'targetNodeId and question are required' }
      );
    });
  });

  describe('generateGoalsHandler', () => {
    it('should generate goals successfully', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'generateGoals', timestamp: Date.now() } },
        content: {
          goal: {
            id: 'goal-1',
            title: 'Learn React',
            description: 'Master React fundamentals',
          } as any,
        },
      };

      mockGenerateGoals.mockResolvedValue(mockResult);
      (mockRequest as any).body = {
        anchorAnswer: 'I want to learn React',
        questionAnswers: [],
      };
      (mockRequest as any).query = { stream: 'false' };

      await generateGoalsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockGenerateGoals).toHaveBeenCalled();
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      // Get the saved graph from the mock call (should be the graph passed to saveGraph)
      const savedGraphCall = mockSaveGraph.mock.calls[0];
      const savedGraph = savedGraphCall ? savedGraphCall[1] : sampleGraph;
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mutations: mockResult.mutations,
          content: mockResult.content,
          graph: savedGraph || sampleGraph,
        })
      );
    });

    it('should handle streaming when stream=true', async () => {
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"title":"' } }] };
        yield { choices: [{ delta: { content: 'Learn React"' } }] };
        yield { choices: [{ delta: { content: '}' } }] };
      })();

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
      // Note: Detailed streaming tests are in graphOperationStreaming.test.ts
    });

    it('should return 400 if required fields are missing', async () => {
      (mockRequest as any).body = {};

      await generateGoalsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        { error: 'anchorAnswer is required and must be a non-empty string' }
      );
    });
  });

  describe('generateLayerPracticeHandler', () => {
    it('should generate layer practice successfully', async () => {
      // Add a layer node to the graph
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
          createRelationship('layer-1', nodeId1, 'containsConcept', 'forward', 1.0),
        ],
      };

      mockGetGraph.mockResolvedValue(graphWithLayer);

      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'generateLayerPractice', timestamp: Date.now() } },
        content: {
          review: '# Layer 1 Review\n\nPractice content...',
        },
      };

      mockGenerateLayerPractice.mockResolvedValue(mockResult);
      (mockRequest as any).body = { layerNumber: 1 };
      (mockRequest as any).query = { stream: 'false' };

      await generateLayerPracticeHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockGenerateLayerPractice).toHaveBeenCalled();
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mutations: mockResult.mutations,
          content: mockResult.content,
          graph: graphWithLayer,
        })
      );
    });

    it('should return 400 if layerNumber is missing', async () => {
      (mockRequest as any).body = {};

      await generateLayerPracticeHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'layerNumber is required' });
    });

    it('should return 404 if no concepts found for layer', async () => {
      (mockRequest as any).body = { layerNumber: 999 };

      await generateLayerPracticeHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No concepts found') })
      );
    });
  });

  describe('customOperationHandler', () => {
    it('should execute custom operation successfully', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'customOperation', timestamp: Date.now() } },
        content: {
          concepts: [
            { name: 'New Concept', action: 'added' as const },
          ],
        },
      };

      mockCustomOperation.mockResolvedValue(mockResult);
      (mockRequest as any).body = {
        targetNodeIds: [nodeId1],
        userPrompt: 'Add a new concept about hooks',
      };
      (mockRequest as any).query = { stream: 'false' };

      await customOperationHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockCustomOperation).toHaveBeenCalled();
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
      // Get the saved graph from the mock call (should be the graph passed to saveGraph)
      const savedGraphCall = mockSaveGraph.mock.calls[0];
      const savedGraph = savedGraphCall ? savedGraphCall[1] : sampleGraph;
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mutations: mockResult.mutations,
          content: mockResult.content,
          graph: savedGraph || sampleGraph,
        })
      );
    });

    it('should return 400 if targetNodeIds is missing', async () => {
      (mockRequest as any).body = { userPrompt: 'Add concept' };

      await customOperationHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('targetNodeIds') })
      );
    });

    it('should return 400 if userPrompt is missing', async () => {
      (mockRequest as any).body = { targetNodeIds: [nodeId1] };

      await customOperationHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'userPrompt is required' });
    });

    it('should return 404 if no valid concept nodes found', async () => {
      const graphWithoutConcepts = {
        ...sampleGraph,
        nodes: { [graphId]: sampleGraph.nodes[graphId] },
      };
      mockGetGraph.mockResolvedValue(graphWithoutConcepts);
      (mockRequest as any).body = {
        targetNodeIds: [nodeId1],
        userPrompt: 'Modify concept',
      };

      await customOperationHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No valid concept nodes') })
      );
    });
  });
});

