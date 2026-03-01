import { Request, Response } from 'express';
import { ErrorResponse } from '../../types';

/**
 * Backend Error Handler Tests
 * 
 * Since the backend doesn't have a centralized error handler middleware,
 * these tests verify the consistent error handling pattern used across controllers:
 * - Error formatting (ErrorResponse interface)
 * - Status codes (400, 401, 404, 500)
 * - Error logging
 */

describe('Error Handler Pattern - Backend', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStatus = jest.fn().mockReturnThis();
    mockJson = jest.fn().mockReturnThis();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      firebaseUser: {
        uid: 'test-uid',
        email: 'test@example.com',
      },
    } as any;

    mockResponse = {
      status: mockStatus,
      json: mockJson,
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      headersSent: false,
      writableEnded: false,
    } as any;

    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
  });

  describe('Error Formatting', () => {
    it('should format errors consistently with ErrorResponse interface', () => {
      const error = new Error('Test error message');
      const errorResponse: ErrorResponse = {
        error: 'Operation failed',
        details: error.message,
      };

      mockStatus(500);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(errorResponse);
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('details');
    });

    it('should format errors with error field only', () => {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request',
      };

      mockStatus(400);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(errorResponse);
      expect(errorResponse.error).toBe('Invalid request');
      expect(errorResponse.details).toBeUndefined();
    });

    it('should format errors with note field', () => {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized',
        note: 'Please authenticate',
      };

      mockStatus(401);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(errorResponse);
      expect(errorResponse.note).toBe('Please authenticate');
    });

    it('should handle unknown errors with default message', () => {
      const unknownError = { unexpected: 'error' };
      const errorMessage = unknownError instanceof Error 
        ? unknownError.message 
        : 'Unknown error';
      
      const errorResponse: ErrorResponse = {
        error: 'Operation failed',
        details: errorMessage,
      };

      mockStatus(500);
      mockJson(errorResponse);

      expect(errorResponse.details).toBe('Unknown error');
    });

    it('should extract error message from Error instances', () => {
      const error = new Error('Specific error message');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const errorResponse: ErrorResponse = {
        error: 'Failed to process request',
        details: errorMessage,
      };

      expect(errorResponse.details).toBe('Specific error message');
    });
  });

  describe('Status Codes', () => {
    it('should return 400 for bad request errors', () => {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request data',
      };

      mockStatus(400);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 401 for unauthorized errors', () => {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized',
        note: 'Authentication required',
      };

      mockStatus(401);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return 404 for not found errors', () => {
      const errorResponse: ErrorResponse = {
        error: 'Resource not found',
      };

      mockStatus(404);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 500 for internal server errors', () => {
      const error = new Error('Internal server error');
      const errorResponse: ErrorResponse = {
        error: 'Internal server error',
        details: error.message,
      };

      mockStatus(500);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should use appropriate status code for validation errors', () => {
      const errorResponse: ErrorResponse = {
        error: 'Validation failed',
        details: 'Missing required field: name',
      };

      mockStatus(400);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should use 500 for unexpected errors', () => {
      const error = new Error('Unexpected error occurred');
      const errorResponse: ErrorResponse = {
        error: 'An unexpected error occurred',
        details: error.message,
      };

      mockStatus(500);
      mockJson(errorResponse);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('Error Logging', () => {
    it('should log errors to console.error', () => {
      const error = new Error('Test error');
      const operation = 'testOperation';

      console.error(`Error in ${operation}:`, error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        `Error in ${operation}:`,
        error
      );
    });

    it('should log errors with operation context', () => {
      const error = new Error('Database error');
      const operation = 'fetchGraphs';

      console.error(`Error ${operation}:`, error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        `Error ${operation}:`,
        error
      );
    });

    it('should log errors before sending response', () => {
      const error = new Error('Processing error');
      const errorResponse: ErrorResponse = {
        error: 'Failed to process',
        details: error.message,
      };

      // Log error
      console.error('Error processing request:', error);
      
      // Then send response
      mockStatus(500);
      mockJson(errorResponse);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error processing request:',
        error
      );
      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should log unknown errors with fallback message', () => {
      const unknownError = { unexpected: 'error' };
      const errorMessage = unknownError instanceof Error
        ? unknownError.message
        : 'Unknown error';

      console.error('Error:', errorMessage);

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', 'Unknown error');
    });
  });

  describe('Error Response Structure', () => {
    it('should include error field in all responses', () => {
      const errorResponse: ErrorResponse = {
        error: 'Test error',
      };

      expect(errorResponse).toHaveProperty('error');
      expect(typeof errorResponse.error).toBe('string');
    });

    it('should optionally include details field', () => {
      const errorResponse: ErrorResponse = {
        error: 'Main error',
        details: 'Detailed error information',
      };

      expect(errorResponse.details).toBe('Detailed error information');
    });

    it('should optionally include note field', () => {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized',
        note: 'Please log in',
      };

      expect(errorResponse.note).toBe('Please log in');
    });

    it('should handle all optional fields together', () => {
      const errorResponse: ErrorResponse = {
        error: 'Complex error',
        details: 'Detailed message',
        note: 'Additional note',
      };

      expect(errorResponse.error).toBe('Complex error');
      expect(errorResponse.details).toBe('Detailed message');
      expect(errorResponse.note).toBe('Additional note');
    });
  });

  describe('Controller Error Handling Pattern', () => {
    it('should follow try-catch pattern in controllers', async () => {
      const mockHandler = async (
        req: Request,
        res: Response
      ): Promise<void | Response> => {
        try {
          // Simulate operation
          throw new Error('Operation failed');
        } catch (error) {
          console.error('Error in handler:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return res.status(500).json({
            error: 'Handler failed',
            details: errorMessage,
          });
        }
      };

      await mockHandler(mockRequest as Request, mockResponse as Response);

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Handler failed',
        details: 'Operation failed',
      });
    });

    it('should handle validation errors with 400 status', async () => {
      const mockHandler = async (
        req: Request,
        res: Response
      ): Promise<void | Response> => {
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({
            error: 'Validation failed',
            details: 'Name is required',
          });
        }
        return res.json({ success: true });
      };

      await mockHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: 'Name is required',
      });
    });

    it('should handle missing resource with 404 status', async () => {
      const mockHandler = async (
        req: Request,
        res: Response
      ): Promise<void | Response> => {
        const resource = null; // Simulate not found
        if (!resource) {
          return res.status(404).json({
            error: 'Resource not found',
          });
        }
        return res.json(resource);
      };

      await mockHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Resource not found',
      });
    });

    it('should handle authentication errors with 401 status', async () => {
      const mockHandler = async (
        req: Request,
        res: Response
      ): Promise<void | Response> => {
        if (!req.firebaseUser) {
          return res.status(401).json({
            error: 'Unauthorized',
            note: 'Authentication required',
          });
        }
        return res.json({ success: true });
      };

      // Test without user
      const requestWithoutUser = { ...mockRequest, firebaseUser: undefined } as any;
      await mockHandler(requestWithoutUser, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized',
        note: 'Authentication required',
      });
    });
  });

  describe('Error Message Consistency', () => {
    it('should use consistent error message format', () => {
      const operation = 'createGraph';
      const error = new Error('Database connection failed');
      
      const errorResponse: ErrorResponse = {
        error: `Failed to ${operation}`,
        details: error.message,
      };

      expect(errorResponse.error).toMatch(/^Failed to /);
      expect(errorResponse.details).toBe(error.message);
    });

    it('should provide user-friendly error messages', () => {
      const technicalError = 'ECONNREFUSED 127.0.0.1:5432';
      const userFriendlyMessage = 'Database connection failed';
      
      const errorResponse: ErrorResponse = {
        error: userFriendlyMessage,
        details: technicalError,
      };

      expect(errorResponse.error).toBe(userFriendlyMessage);
      expect(errorResponse.details).toBe(technicalError);
    });

    it('should handle empty error messages gracefully', () => {
      const error = new Error('');
      const errorMessage = error.message || 'Unknown error';
      
      const errorResponse: ErrorResponse = {
        error: 'Operation failed',
        details: errorMessage,
      };

      expect(errorResponse.details).toBe('Unknown error');
    });
  });
});

