import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

// Mock Firebase Admin - Note: Each test file should mock this individually
export const mockGetFirebaseAuth = jest.fn();
export const mockVerifyIdToken = jest.fn();

// Setup mock Firebase Auth before tests
export const setupFirebaseAdminMocks = () => {
  mockGetFirebaseAuth.mockReturnValue({
    verifyIdToken: mockVerifyIdToken,
  });
};

// Helper to create a mock DecodedIdToken
export const createMockDecodedToken = (overrides: Partial<DecodedIdToken> = {}): DecodedIdToken => {
  const now = Math.floor(Date.now() / 1000);
  return {
    uid: 'test-uid',
    email: 'test@example.com',
    email_verified: true,
    auth_time: now,
    iat: now,
    exp: now + 3600,
    aud: 'test-aud',
    iss: 'test-iss',
    sub: 'test-uid',
    firebase: {
      identities: {},
      sign_in_provider: 'password',
    },
    ...overrides,
  };
};

// Helper to create a mock Express Request with Firebase user
export const createMockRequest = (
  overrides: Partial<Request> = {},
  firebaseUser?: DecodedIdToken
): Partial<Request> => {
  return {
    headers: {},
    params: {},
    body: {},
    firebaseUser,
    ...overrides,
  };
};

// Helper to create a mock Express Response
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    locals: {},
  };
  return res;
};

// Helper to create a mock NextFunction
export const createMockNext = (): NextFunction => {
  return jest.fn();
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockGetFirebaseAuth.mockClear();
  mockVerifyIdToken.mockClear();
};

