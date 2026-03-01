/**
 * Tests for useConceptsByLayer Hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useConceptsByLayer } from '../../../../features/knowledge-graph/hooks/useConceptsByLayer';
import { graphQueryApi } from '../../../../features/knowledge-graph/api/queryApi';
import type { ConceptDisplay } from '../../../../features/knowledge-graph/api/types';

// Mock the query API
jest.mock('../../../../features/knowledge-graph/api/queryApi', () => ({
  graphQueryApi: {
    getConceptsByLayer: jest.fn(),
  },
}));

const mockApi = graphQueryApi as jest.Mocked<typeof graphQueryApi>;

describe('useConceptsByLayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch concepts on mount when graphId is provided', async () => {
    const mockConcept: ConceptDisplay = {
      id: 'concept-1',
      name: 'Variables',
      description: 'Understanding variables',
      layer: 1,
      isSeed: true,
      parents: [],
      children: ['concept-2'],
      prerequisites: [],
      properties: {},
    };

    const mockResponse = {
      concepts: [mockConcept],
      layerInfo: [
        {
          layerNumber: 1,
          conceptCount: 1,
        },
      ],
    };

    mockApi.getConceptsByLayer.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useConceptsByLayer('graph-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.concepts).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.concepts).toEqual([mockConcept]);
    expect(result.current.layerInfo).toEqual(mockResponse.layerInfo);
    expect(result.current.error).toBeNull();
    expect(mockApi.getConceptsByLayer).toHaveBeenCalledWith('graph-1', undefined);
  });

  it('should not fetch when graphId is empty', async () => {
    const { result } = renderHook(() => useConceptsByLayer(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.concepts).toEqual([]);
    expect(mockApi.getConceptsByLayer).not.toHaveBeenCalled();
  });

  it('should pass options to API', async () => {
    const mockResponse = {
      concepts: [],
      layerInfo: [],
      groupedByLayer: {
        1: [],
      },
    };

    mockApi.getConceptsByLayer.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useConceptsByLayer('graph-1', {
        includeRelationships: false,
        groupByLayer: true,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getConceptsByLayer).toHaveBeenCalledWith('graph-1', {
      includeRelationships: false,
      groupByLayer: true,
    });
  });

  it('should handle groupedByLayer response', async () => {
    const mockConcept: ConceptDisplay = {
      id: 'concept-1',
      name: 'Variables',
      description: 'Understanding variables',
      layer: 1,
      isSeed: false,
      parents: [],
      children: [],
      prerequisites: [],
      properties: {},
    };

    const mockResponse = {
      concepts: [mockConcept],
      groupedByLayer: {
        1: [mockConcept],
      },
      layerInfo: [],
    };

    mockApi.getConceptsByLayer.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useConceptsByLayer('graph-1', { groupByLayer: true })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groupedByLayer).toEqual({ 1: [mockConcept] });
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch concepts');
    mockApi.getConceptsByLayer.mockRejectedValue(error);

    const { result } = renderHook(() => useConceptsByLayer('graph-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch concepts');
    expect(result.current.concepts).toEqual([]);
  });

  it('should refetch when options change', async () => {
    const mockResponse = {
      concepts: [],
      layerInfo: [],
    };

    mockApi.getConceptsByLayer.mockResolvedValue(mockResponse);

    const { result, rerender } = renderHook(
      ({ graphId, options }) => useConceptsByLayer(graphId, options),
      {
        initialProps: {
          graphId: 'graph-1',
          options: { includeRelationships: true },
        },
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getConceptsByLayer).toHaveBeenCalledWith('graph-1', {
      includeRelationships: true,
    });

    rerender({
      graphId: 'graph-1',
      options: { includeRelationships: false },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getConceptsByLayer).toHaveBeenCalledWith('graph-1', {
      includeRelationships: false,
    });
  });

  it('should support refetch', async () => {
    const mockResponse = {
      concepts: [],
      layerInfo: [],
    };

    mockApi.getConceptsByLayer.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useConceptsByLayer('graph-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getConceptsByLayer).toHaveBeenCalledTimes(1);

    // Refetch
    await waitFor(async () => {
      await result.current.refetch();
    });

    expect(mockApi.getConceptsByLayer).toHaveBeenCalledTimes(2);
  });

  it('should prevent duplicate concurrent requests for the same request key', async () => {
    const mockResponse = {
      concepts: [],
      layerInfo: [],
    };

    let resolveFirst: (value: typeof mockResponse) => void;
    const firstPromise = new Promise<typeof mockResponse>((resolve) => {
      resolveFirst = resolve;
    });

    mockApi.getConceptsByLayer.mockImplementation(() => firstPromise);

    const { result, rerender } = renderHook(
      ({ graphId, options }) => useConceptsByLayer(graphId, options),
      {
        initialProps: {
          graphId: 'graph-1',
          options: { includeRelationships: true, groupByLayer: false },
        },
      }
    );

    expect(result.current.loading).toBe(true);
    expect(mockApi.getConceptsByLayer).toHaveBeenCalledTimes(1);

    // Re-render with same options (should not trigger another call while loading)
    rerender({
      graphId: 'graph-1',
      options: { includeRelationships: true, groupByLayer: false },
    });

    // Should still only have one API call because the request key is the same
    expect(mockApi.getConceptsByLayer).toHaveBeenCalledTimes(1);

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

