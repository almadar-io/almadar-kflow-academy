import { Request, Response, NextFunction } from 'express';
import { authenticateFirebase } from '../../middlewares/authenticateFirebase';
import { getFirebaseAuth } from '../../config/firebaseAdmin';
import { DecodedIdToken } from 'firebase-admin/auth';

// Mock Firebase Admin
jest.mock('../../config/firebaseAdmin', () => ({
  getFirebaseAuth: jest.fn(),
}));

describe('authenticateFirebase Middleware - Backend', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockVerifyIdToken: jest.Mock;

  beforeEach(() => {
    mockVerifyIdToken = jest.fn();
    (getFirebaseAuth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {},
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Verification', () => {
    it('should accept valid Firebase ID token', async () => {
      const decodedToken: DecodedIdToken = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'test-aud',
        iss: 'test-iss',
        sub: 'test-uid-123',
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
      };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockRequest.firebaseUser).toEqual(decodedToken);
      expect(mockResponse.locals?.firebaseUser).toEqual(decodedToken);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should set req.firebaseUser with decoded token', async () => {
      const decodedToken: DecodedIdToken = {
        uid: 'user-123',
        email: 'user@example.com',
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'test-aud',
        iss: 'test-iss',
        sub: 'user-123',
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
      };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.firebaseUser).toEqual(decodedToken);
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 for invalid/malformed token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed token format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization header missing or malformed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Missing Token', () => {
    it('should return 401 when Authorization header is missing', async () => {
      mockRequest.headers = {};

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization header missing or malformed',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is empty', async () => {
      mockRequest.headers = {
        authorization: '',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization header missing or malformed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Expired Token', () => {
    it('should return 401 for expired token', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockVerifyIdToken.mockRejectedValue(expiredError);

      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('User Context', () => {
    it('should attach firebaseUser to request object', async () => {
      const decodedToken: DecodedIdToken = {
        uid: 'test-uid',
        email: 'test@example.com',
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'test-aud',
        iss: 'test-iss',
        sub: 'test-uid',
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
      };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.firebaseUser).toBeDefined();
      expect(mockRequest.firebaseUser?.uid).toBe('test-uid');
      expect(mockRequest.firebaseUser?.email).toBe('test@example.com');
    });

    it('should attach firebaseUser to response locals', async () => {
      const decodedToken: DecodedIdToken = {
        uid: 'test-uid',
        email: 'test@example.com',
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'test-aud',
        iss: 'test-iss',
        sub: 'test-uid',
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
      };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.locals?.firebaseUser).toBeDefined();
      expect(mockResponse.locals?.firebaseUser).toEqual(decodedToken);
    });

    it('should extract token correctly from Bearer prefix', async () => {
      const decodedToken: DecodedIdToken = {
        uid: 'test-uid',
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'test-aud',
        iss: 'test-iss',
        sub: 'test-uid',
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
      };
      mockVerifyIdToken.mockResolvedValue(decodedToken);

      mockRequest.headers = {
        authorization: 'Bearer my-token-123',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyIdToken).toHaveBeenCalledWith('my-token-123');
    });
  });

  describe('Error Handling', () => {
    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Firebase error');
      mockVerifyIdToken.mockRejectedValue(error);

      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(consoleSpy).toHaveBeenCalledWith('Firebase authentication failed:', error);
      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      mockVerifyIdToken.mockRejectedValue('String error');

      mockRequest.headers = {
        authorization: 'Bearer token',
      };

      await authenticateFirebase(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});

