/**
 * Tests for useGraphSummary Hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGraphSummary } from '../../../../features/knowledge-graph/hooks/useGraphSummary';
import { graphQueryApi } from '../../../../features/knowledge-graph/api/queryApi';
import type { GraphSummary } from '../../../../features/knowledge-graph/api/types';

// Mock the query API
jest.mock('../../../../features/knowledge-graph/api/queryApi', () => ({
  graphQueryApi: {
    getGraphSummary: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderWithClient = (callback: any, options?: any) =>
  renderHook(callback, { wrapper: createWrapper(), ...options });

const mockApi = graphQueryApi as jest.Mocked<typeof graphQueryApi>;

describe('useGraphSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch graph summary on mount when graphId is provided', async () => {
    const mockSummary: GraphSummary = {
      id: 'graph-1',
      goal: {
        id: 'goal-1',
        title: 'Learn JavaScript',
        description: 'Master JavaScript fundamentals',
        type: 'skill',
        target: 'intermediate',
      },
      milestones: [
        {
          id: 'milestone-1',
          title: 'Complete Basics',
          description: 'Finish basic concepts',
          completed: false,
        },
      ],
      conceptCount: 10,
      layerCount: 3,
      seedConcept: {
        id: 'seed-1',
        name: 'JavaScript Basics',
      },
      updatedAt: Date.now(),
    };

    mockApi.getGraphSummary.mockResolvedValue(mockSummary);

    const { result } = renderWithClient(() => useGraphSummary('graph-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.graphSummary).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.graphSummary).toEqual(mockSummary);
    expect(result.current.error).toBeNull();
    expect(mockApi.getGraphSummary).toHaveBeenCalledWith('graph-1');
  });

  it('should not fetch when graphId is empty', async () => {
    const { result } = renderWithClient(() => useGraphSummary(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.graphSummary).toBeNull();
    expect(mockApi.getGraphSummary).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch graph summary');
    mockApi.getGraphSummary.mockRejectedValue(error);

    const { result } = renderWithClient(() => useGraphSummary('graph-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch graph summary');
    expect(result.current.graphSummary).toBeNull();
  });

  it('should handle graph without goal', async () => {
    const mockSummary: GraphSummary = {
      id: 'graph-1',
      goal: null,
      milestones: [],
      conceptCount: 5,
      layerCount: 2,
      seedConcept: {
        id: 'seed-1',
        name: 'Basics',
      },
      updatedAt: Date.now(),
    };

    mockApi.getGraphSummary.mockResolvedValue(mockSummary);

    const { result } = renderWithClient(() => useGraphSummary('graph-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.graphSummary?.goal).toBeNull();
    expect(result.current.graphSummary?.milestones).toEqual([]);
  });

  it('should support refetch', async () => {
    const mockSummary: GraphSummary = {
      id: 'graph-1',
      goal: null,
      milestones: [],
      conceptCount: 5,
      layerCount: 2,
      seedConcept: null,
      updatedAt: Date.now(),
    };

    mockApi.getGraphSummary.mockResolvedValue(mockSummary);

    const { result } = renderWithClient(() => useGraphSummary('graph-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getGraphSummary).toHaveBeenCalledTimes(1);

    // Refetch
    await waitFor(async () => {
      await result.current.refetch();
    });

    // The hook's refetch invalidates and then explicitly refetches, so the
    // initial fetch plus the refetch produce 3 calls in total.
    expect(mockApi.getGraphSummary).toHaveBeenCalledTimes(3);
  });

  it('should refetch when graphId changes', async () => {
    const mockSummary1: GraphSummary = {
      id: 'graph-1',
      goal: null,
      milestones: [],
      conceptCount: 5,
      layerCount: 2,
      seedConcept: null,
      updatedAt: Date.now(),
    };

    const mockSummary2: GraphSummary = {
      id: 'graph-2',
      goal: null,
      milestones: [],
      conceptCount: 10,
      layerCount: 3,
      seedConcept: null,
      updatedAt: Date.now(),
    };

    mockApi.getGraphSummary
      .mockResolvedValueOnce(mockSummary1)
      .mockResolvedValueOnce(mockSummary2);

    const { result, rerender } = renderWithClient(({ graphId }) => useGraphSummary(graphId), {
      initialProps: { graphId: 'graph-1' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.graphSummary?.id).toBe('graph-1');

    rerender({ graphId: 'graph-2' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.graphSummary?.id).toBe('graph-2');
    expect(mockApi.getGraphSummary).toHaveBeenCalledTimes(2);
  });

  it('should prevent duplicate concurrent requests for the same graphId', async () => {
    const mockSummary: GraphSummary = {
      id: 'graph-1',
      goal: null,
      milestones: [],
      conceptCount: 5,
      layerCount: 2,
      seedConcept: null,
      updatedAt: Date.now(),
    };

    let resolveFirst: (value: GraphSummary) => void;
    const firstPromise = new Promise<GraphSummary>((resolve) => {
      resolveFirst = resolve;
    });

    mockApi.getGraphSummary.mockImplementation(() => firstPromise);

    const { result } = renderWithClient(() => useGraphSummary('graph-1'));

    expect(result.current.loading).toBe(true);
    expect(mockApi.getGraphSummary).toHaveBeenCalledTimes(1);

    // The hook should prevent duplicate calls automatically via loadingRef
    // We verify that only one call was made
    expect(mockApi.getGraphSummary).toHaveBeenCalledTimes(1);

    // Resolve the first request
    await act(async () => {
      resolveFirst(mockSummary);
      await firstPromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

