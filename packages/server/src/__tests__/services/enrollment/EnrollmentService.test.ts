/**
 * Smoke tests for enrollmentService exports.
 */

import * as enrollmentService from '../../../services/enrollmentService';

jest.mock('@almadar/server', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })),
  })),
  getFirebaseAuth: jest.fn(),
  getFirebaseAdmin: jest.fn(),
  setupSSE: jest.fn(),
  sendSSEEvent: jest.fn(),
  sendSSEDone: jest.fn(),
  closeSSE: jest.fn(),
}));

jest.mock('../../../services/cacheService', () => ({
  hybridCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  CACHE_TTL: {},
}));

jest.mock('../../../services/cacheInvalidation', () => ({
  CACHE_KEYS: {},
}));

jest.mock('../../../services/studentDataAccess', () => ({
  accessLayer: {
    getEnrollment: jest.fn(),
    listEnrollments: jest.fn().mockResolvedValue([]),
  },
}));

describe('enrollmentService', () => {
  it('exports expected functions', () => {
    expect(typeof enrollmentService.getEnrollmentById).toBe('function');
    expect(typeof enrollmentService.getEnrollment).toBe('function');
    expect(typeof enrollmentService.getStudentEnrollments).toBe('function');
    expect(typeof enrollmentService.getEnrolledCoursesWithDetails).toBe('function');
    expect(typeof enrollmentService.getCourseEnrollment).toBe('function');
    expect(typeof enrollmentService.updateEnrollmentsForCourse).toBe('function');
  });
});
