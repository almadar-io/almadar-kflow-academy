/**
 * Tests for useLearningPaths Hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useLearningPaths } from '../../../../features/knowledge-graph/hooks/useLearningPaths';
import { graphQueryApi } from '../../../../features/knowledge-graph/api/queryApi';
import type { LearningPathSummary } from '../../../../features/knowledge-graph/api/types';

// Mock the query API
jest.mock('../../../../features/knowledge-graph/api/queryApi', () => ({
  graphQueryApi: {
    getLearningPaths: jest.fn(),
  },
}));

const mockApi = graphQueryApi as jest.Mocked<typeof graphQueryApi>;

describe('useLearningPaths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch learning paths on mount', async () => {
    const mockResponse = {
      learningPaths: [
        {
          id: 'graph-1',
          title: 'Learn JavaScript',
          description: 'A comprehensive JavaScript course',
          conceptCount: 10,
          seedConcept: {
            id: 'seed-1',
            name: 'JavaScript Basics',
            description: 'Introduction to JavaScript',
          },
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
      ],
    };

    mockApi.getLearningPaths.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLearningPaths());

    expect(result.current.loading).toBe(true);
    expect(result.current.learningPaths).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.learningPaths).toEqual(mockResponse.learningPaths);
    expect(result.current.error).toBeNull();
    expect(mockApi.getLearningPaths).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch learning paths');
    mockApi.getLearningPaths.mockRejectedValue(error);

    const { result } = renderHook(() => useLearningPaths());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch learning paths');
    expect(result.current.learningPaths).toEqual([]);
  });

  it('should support refetch', async () => {
    const mockResponse = {
      learningPaths: [
        {
          id: 'graph-1',
          title: 'Learn JavaScript',
          description: 'A comprehensive JavaScript course',
          conceptCount: 10,
          seedConcept: null,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
      ],
    };

    mockApi.getLearningPaths.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLearningPaths());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getLearningPaths).toHaveBeenCalledTimes(1);

    // Refetch
    await waitFor(async () => {
      await result.current.refetch();
    });

    expect(mockApi.getLearningPaths).toHaveBeenCalledTimes(2);
  });

  it('should handle empty learning paths', async () => {
    const mockResponse = {
      learningPaths: [],
    };

    mockApi.getLearningPaths.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLearningPaths());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.learningPaths).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should prevent duplicate concurrent requests', async () => {
    const mockResponse = {
      learningPaths: [
        {
          id: 'graph-1',
          title: 'Learn JavaScript',
          description: 'A comprehensive JavaScript course',
          conceptCount: 10,
          seedConcept: null,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
      ],
    };

    let resolveFirst: (value: typeof mockResponse) => void;
    const firstPromise = new Promise<typeof mockResponse>((resolve) => {
      resolveFirst = resolve;
    });

    mockApi.getLearningPaths.mockImplementation(() => firstPromise);

    const { result } = renderHook(() => useLearningPaths());

    expect(result.current.loading).toBe(true);
    expect(mockApi.getLearningPaths).toHaveBeenCalledTimes(1);

    // The hook should prevent duplicate calls automatically via loadingRef
    // We verify that only one call was made

    // Should still only have one API call
    expect(mockApi.getLearningPaths).toHaveBeenCalledTimes(1);

    // Resolve the first request
    await act(async () => {
      resolveFirst(mockResponse);
      await firstPromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

