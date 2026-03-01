/**
 * Tests for Graph Access Authorization Middleware
 * 
 * Tests Express middleware for graph authorization.
 */

import { Request, Response, NextFunction } from 'express';
import { authorizeGraphAccess, authorizeGraphRead, authorizeGraphWrite, authorizeGraphDelete } from '../../middlewares/authorizeGraphAccess';
import { AuthorizationError } from '../../types/graphAuthorization';
import type { DecodedIdToken } from 'firebase-admin/auth';

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

const { mockVerifyGraphAccess } = require('../../services/graphAuthorizationService').__mocks;

describe('authorizeGraphAccess middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: { graphId: 'test-graph-1' },
      firebaseUser: { uid: 'user-1' } as DecodedIdToken,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authorizeGraphRead', () => {
    it('should call next() if user has read access', async () => {
      mockVerifyGraphAccess.mockResolvedValue(undefined);

      const middleware = authorizeGraphRead;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith('user-1', 'test-graph-1', 'read');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 404 if graph not found', async () => {
      const error = new AuthorizationError('Graph not found', 'NOT_FOUND', 'test-graph-1', 'user-1');
      mockVerifyGraphAccess.mockRejectedValue(error);

      const middleware = authorizeGraphRead;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith('user-1', 'test-graph-1', 'read');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Graph not found',
        code: 'NOT_FOUND',
        graphId: 'test-graph-1',
      });
    });

    it('should return 403 if access forbidden', async () => {
      const error = new AuthorizationError('Access denied', 'FORBIDDEN', 'test-graph-1', 'user-1');
      mockVerifyGraphAccess.mockRejectedValue(error);

      const middleware = authorizeGraphRead;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access denied',
        code: 'FORBIDDEN',
        graphId: 'test-graph-1',
      });
    });

    it('should return 401 if unauthorized', async () => {
      const error = new AuthorizationError('Unauthorized', 'UNAUTHORIZED', 'test-graph-1', 'user-1');
      mockVerifyGraphAccess.mockRejectedValue(error);

      const middleware = authorizeGraphRead;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        graphId: 'test-graph-1',
      });
    });

    it('should return 500 for unknown errors', async () => {
      mockVerifyGraphAccess.mockRejectedValue(new Error('Database error'));

      const middleware = authorizeGraphRead;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error during authorization',
      });
    });
  });

  describe('authorizeGraphWrite', () => {
    it('should call next() if user has write access', async () => {
      mockVerifyGraphAccess.mockResolvedValue(undefined);

      const middleware = authorizeGraphWrite;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith('user-1', 'test-graph-1', 'write');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorizeGraphDelete', () => {
    it('should call next() if user has delete access', async () => {
      mockVerifyGraphAccess.mockResolvedValue(undefined);

      const middleware = authorizeGraphDelete;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith('user-1', 'test-graph-1', 'delete');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorizeGraphAccess with custom operation', () => {
    it('should use custom operation type', async () => {
      mockVerifyGraphAccess.mockResolvedValue(undefined);

      const middleware = authorizeGraphAccess('write');
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith('user-1', 'test-graph-1', 'write');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('missing graphId', () => {
    it('should return 401 if graphId is missing', async () => {
      mockRequest.params = {};

      const middleware = authorizeGraphRead;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Graph ID is required'),
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('missing user', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.firebaseUser = undefined;

      const middleware = authorizeGraphRead;
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Unauthorized'),
          code: 'UNAUTHORIZED',
        })
      );
    });
  });
});

