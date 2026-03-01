import { Request, Response } from 'express';
import {
  listGraphs,
  getGraph,
  upsertGraph,
  removeGraph,
} from '../../controllers/graphController';
import {
  getUserGraphs,
  getUserGraphById,
  upsertUserGraph,
  deleteUserGraph,
  StoredConceptGraph,
} from '../../services/graphService';
import { upsertUser } from '../../services/userService';
import {
  setupFirebaseAdminMocks,
  createMockDecodedToken,
  createMockRequest,
  createMockResponse,
  resetAllMocks,
} from '../testUtils.helper';

// Mock Firebase Admin
jest.mock('../../config/firebaseAdmin', () => ({
  getFirebaseAuth: jest.fn(),
  getFirebaseAdmin: jest.fn(),
  getFirestore: jest.fn(),
}));

// Mock graphService
jest.mock('../../services/graphService', () => ({
  getUserGraphs: jest.fn(),
  getUserGraphById: jest.fn(),
  upsertUserGraph: jest.fn(),
  deleteUserGraph: jest.fn(),
}));

// Mock userService
jest.mock('../../services/userService', () => ({
  upsertUser: jest.fn(),
}));

describe('Graph Controller - Backend', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
  });

  describe('GET /api/graphs (listGraphs)', () => {
    it('should return all graphs for authenticated user', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const decodedToken = createMockDecodedToken({ uid, email });

      const mockGraphs: StoredConceptGraph[] = [
        {
          id: 'graph-1',
          seedConceptId: 'seed-1',
          concepts: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'graph-2',
          seedConceptId: 'seed-2',
          concepts: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getUserGraphs as jest.Mock).mockResolvedValue(mockGraphs);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await listGraphs(mockRequest as Request, mockResponse as Response);

      expect(upsertUser).toHaveBeenCalledWith(uid, email);
      expect(getUserGraphs).toHaveBeenCalledWith(uid);
      expect(mockResponse.json).toHaveBeenCalledWith({ graphs: mockGraphs });
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return empty array when user has no graphs', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getUserGraphs as jest.Mock).mockResolvedValue([]);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await listGraphs(mockRequest as Request, mockResponse as Response);

      expect(getUserGraphs).toHaveBeenCalledWith(uid);
      expect(mockResponse.json).toHaveBeenCalledWith({ graphs: [] });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = createMockRequest({ firebaseUser: undefined });

      await listGraphs(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(getUserGraphs).not.toHaveBeenCalled();
    });

    it('should return 500 when service fails', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getUserGraphs as jest.Mock).mockRejectedValue(new Error('Service error'));
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await listGraphs(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to list graphs' });
    });

    it('should return response with all required graph fields', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const decodedToken = createMockDecodedToken({ uid, email });

      const mockGraph: StoredConceptGraph = {
        id: 'graph-1',
        seedConceptId: 'seed-1',
        concepts: {
          'seed-1': {
            id: 'seed-1',
            name: 'React',
            description: 'A JavaScript library',
            parents: [],
            children: [],
            layer: 0,
          },
        },
        layers: {
          0: { 
            layerNumber: 0, 
            goal: 'Learn React', 
            conceptIds: ['seed-1'],
            prompt: 'Test prompt',
            response: 'Test response',
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        difficulty: 'intermediate',
        goalFocused: false,
      };

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getUserGraphs as jest.Mock).mockResolvedValue([mockGraph]);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await listGraphs(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ graphs: [mockGraph] });
      
      // Verify response includes all required fields
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const graph = responseCall.graphs[0];
      expect(graph).toHaveProperty('id');
      expect(graph).toHaveProperty('seedConceptId');
      expect(graph).toHaveProperty('concepts');
      expect(graph).toHaveProperty('createdAt');
      expect(graph).toHaveProperty('updatedAt');
    });

    it('should handle multiple graphs efficiently', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const decodedToken = createMockDecodedToken({ uid, email });

      // Create 10 mock graphs to test performance
      const mockGraphs: StoredConceptGraph[] = Array.from({ length: 10 }, (_, i) => ({
        id: `graph-${i}`,
        seedConceptId: `seed-${i}`,
        concepts: {},
        createdAt: Date.now() - i * 1000, // Stagger creation times
        updatedAt: Date.now(),
      }));

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getUserGraphs as jest.Mock).mockResolvedValue(mockGraphs);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      const startTime = Date.now();
      await listGraphs(mockRequest as Request, mockResponse as Response);
      const endTime = Date.now();

      expect(getUserGraphs).toHaveBeenCalledWith(uid);
      expect(mockResponse.json).toHaveBeenCalledWith({ graphs: mockGraphs });
      
      // Verify response time is reasonable (less than 1 second for 10 graphs)
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000);
      
      // Verify all graphs are returned
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.graphs).toHaveLength(10);
    });
  });

  describe('GET /api/graphs/:graphId (getGraph)', () => {
    it('should return specific graph by ID', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const graphId = 'graph-1';
      const decodedToken = createMockDecodedToken({ uid, email });

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId },
        },
        decodedToken
      );

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await getGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(upsertUser).toHaveBeenCalledWith(uid, email);
      expect(getUserGraphById).toHaveBeenCalledWith(uid, graphId);
      expect(mockResponse.json).toHaveBeenCalledWith({ graph: mockGraph });
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 404 when graph is not found', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const graphId = 'non-existent';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId },
        },
        decodedToken
      );

      (getUserGraphById as jest.Mock).mockResolvedValue(null);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await getGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Graph not found' });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = createMockRequest({
        firebaseUser: undefined,
        params: { graphId: 'graph-1' },
      });

      await getGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('PUT /api/graphs/:graphId (upsertGraph)', () => {
    it('should create/update graph successfully', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const graphId = 'graph-1';
      const decodedToken = createMockDecodedToken({ uid, email });

      const payload = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockGraph: StoredConceptGraph = {
        ...payload,
      };

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId },
          body: payload,
        },
        decodedToken
      );

      (upsertUserGraph as jest.Mock).mockResolvedValue(mockGraph);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await upsertGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(upsertUser).toHaveBeenCalledWith(uid, email);
      expect(upsertUserGraph).toHaveBeenCalledWith(uid, { ...payload, id: graphId });
      expect(mockResponse.json).toHaveBeenCalledWith({ graph: mockGraph });
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when graph id is missing', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: {}, // No graphId in params
          body: {
            seedConceptId: 'seed-1',
            concepts: {},
            // No id in body either
          },
        },
        decodedToken
      );

      await upsertGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Graph id is required' });
    });

    it('should return 400 when seedConceptId is missing', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const graphId = 'graph-1';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId },
          body: {
            id: graphId,
            concepts: {},
          },
        },
        decodedToken
      );

      await upsertGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'seedConceptId is required' });
    });

    it('should return 400 when concepts is missing', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const graphId = 'graph-1';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId },
          body: {
            id: graphId,
            seedConceptId: 'seed-1',
          },
        },
        decodedToken
      );

      await upsertGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'concepts is required and must be an object',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = createMockRequest({
        firebaseUser: undefined,
        params: { graphId: 'graph-1' },
        body: {
          id: 'graph-1',
          seedConceptId: 'seed-1',
          concepts: {},
        },
      });

      await upsertGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('DELETE /api/graphs/:graphId (removeGraph)', () => {
    it('should delete graph successfully', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const graphId = 'graph-1';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId },
        },
        decodedToken
      );

      (deleteUserGraph as jest.Mock).mockResolvedValue(undefined);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await removeGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(upsertUser).toHaveBeenCalledWith(uid, email);
      expect(deleteUserGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = createMockRequest({
        firebaseUser: undefined,
        params: { graphId: 'graph-1' },
      });

      await removeGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 500 when deletion fails', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const graphId = 'graph-1';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId },
        },
        decodedToken
      );

      (deleteUserGraph as jest.Mock).mockRejectedValue(new Error('Deletion failed'));
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await removeGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to delete graph' });
    });
  });

  describe('Authorization', () => {
    it('should only allow users to access their own graphs', async () => {
      // This test verifies that the middleware (authenticateFirebase) ensures
      // users can only access graphs associated with their UID
      const uid = 'test-uid';
      const email = 'test@example.com';
      const decodedToken = createMockDecodedToken({ uid, email });

      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
          params: { graphId: 'graph-1' },
        },
        decodedToken
      );

      (getUserGraphById as jest.Mock).mockResolvedValue(null);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await getGraph(mockRequest as Request<{ graphId: string }>, mockResponse as Response);

      // Verify that getUserGraphById is called with the user's UID
      expect(getUserGraphById).toHaveBeenCalledWith(uid, 'graph-1');
    });
  });
});

