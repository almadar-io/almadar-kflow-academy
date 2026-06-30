// @ts-nocheck
import { jest } from '@jest/globals';

/**
 * Global Jest setup for the Kflow server package.
 *
 * `@almadar/server` reads from a real Firebase Admin singleton at runtime.
 * Tests never have Firebase initialized, so provide safe no-op mocks here.
 * Individual tests can still override these with `jest.mock('@almadar/server', ...)`.
 */
jest.mock('@almadar/server', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        collection: jest.fn(),
      })),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      add: jest.fn(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    })),
    runTransaction: jest.fn(),
    collectionGroup: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
      count: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) })),
    })),
  })),
  getFirebaseAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
  })),
  getFirebaseAdmin: jest.fn(() => ({
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(),
        arrayUnion: jest.fn(),
        arrayRemove: jest.fn(),
        increment: jest.fn(),
      },
    },
  })),
  authenticateFirebase: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  setupSSE: jest.fn(),
  sendSSEEvent: jest.fn(),
  sendSSEDone: jest.fn(),
  closeSSE: jest.fn(),
}));
