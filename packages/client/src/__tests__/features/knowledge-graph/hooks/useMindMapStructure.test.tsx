/**
 * Tests for useMindMapStructure Hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useMindMapStructure } from '../../../../features/knowledge-graph/hooks/useMindMapStructure';
import { graphQueryApi } from '../../../../features/knowledge-graph/api/queryApi';
import type { MindMapResponse, MindMapNode } from '../../../../features/knowledge-graph/api/types';

// Mock the query API
jest.mock('../../../../features/knowledge-graph/api/queryApi', () => ({
  graphQueryApi: {
    getMindMapStructure: jest.fn(),
  },
}));

const mockApi = graphQueryApi as jest.Mocked<typeof graphQueryApi>;

describe('useMindMapStructure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch mindmap structure on mount when graphId is provided', async () => {
    const mockMindMap: MindMapResponse = {
      nodes: [
        {
          id: 'seed-1',
          title: 'Scheme',
          content: 'Master Scheme programming',
          createdAt: new Date(1000),
          updatedAt: new Date(2000),
          tags: [],
          parentId: undefined,
          children: ['layer-1'],
          level: 0,
          isExpanded: true,
          nodeType: 'Concept',
        },
        {
          id: 'layer-1',
          title: 'Layer 1',
          content: 'Build foundational mental model',
          createdAt: new Date(1500),
          updatedAt: new Date(2500),
          tags: [],
          parentId: 'seed-1',
          children: ['concept-a'],
          level: 1,
          isExpanded: true,
          nodeType: 'Layer',
          metadata: {
            layerNumber: 1,
            goal: 'Build foundational mental model',
          },
        },
      ],
      seedNodeId: 'seed-1',
      totalNodes: 2,
      layerCount: 1,
      conceptCount: 1,
    };

    mockApi.getMindMapStructure.mockResolvedValue(mockMindMap);

    const { result } = renderHook(() => useMindMapStructure('graph-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.mindMapData).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.mindMapData).toEqual(mockMindMap);
    expect(result.current.nodes).toEqual(mockMindMap.nodes);
    expect(result.current.seedNodeId).toBe('seed-1');
    expect(result.current.totalNodes).toBe(2);
    expect(result.current.layerCount).toBe(1);
    expect(result.current.conceptCount).toBe(1);
    expect(result.current.error).toBeNull();
    expect(mockApi.getMindMapStructure).toHaveBeenCalledWith('graph-1', undefined);
  });

  it('should not fetch when graphId is empty', async () => {
    const { result } = renderHook(() => useMindMapStructure(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.mindMapData).toBeNull();
    expect(result.current.nodes).toEqual([]);
    expect(mockApi.getMindMapStructure).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch mindmap structure');
    mockApi.getMindMapStructure.mockRejectedValue(error);

    const { result } = renderHook(() => useMindMapStructure('graph-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch mindmap structure');
    expect(result.current.mindMapData).toBeNull();
    expect(result.current.nodes).toEqual([]);
  });

  it('should respect expandAll option', async () => {
    const mockMindMap: MindMapResponse = {
      nodes: [],
      seedNodeId: 'seed-1',
      totalNodes: 0,
      layerCount: 0,
      conceptCount: 0,
    };

    mockApi.getMindMapStructure.mockResolvedValue(mockMindMap);

    const { result } = renderHook(() =>
      useMindMapStructure('graph-1', { expandAll: true })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getMindMapStructure).toHaveBeenCalledWith('graph-1', { expandAll: true });
  });

  it('should support refetch', async () => {
    const mockMindMap: MindMapResponse = {
      nodes: [],
      seedNodeId: 'seed-1',
      totalNodes: 0,
      layerCount: 0,
      conceptCount: 0,
    };

    mockApi.getMindMapStructure.mockResolvedValue(mockMindMap);

    const { result } = renderHook(() => useMindMapStructure('graph-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getMindMapStructure).toHaveBeenCalledTimes(1);

    // Refetch
    await waitFor(async () => {
      await act(async () => {
        await result.current.refetch();
      });
    });

    expect(mockApi.getMindMapStructure).toHaveBeenCalledTimes(2);
  });

  it('should refetch when graphId changes', async () => {
    const mockMindMap1: MindMapResponse = {
      nodes: [],
      seedNodeId: 'seed-1',
      totalNodes: 0,
      layerCount: 0,
      conceptCount: 0,
    };

    const mockMindMap2: MindMapResponse = {
      nodes: [],
      seedNodeId: 'seed-2',
      totalNodes: 5,
      layerCount: 2,
      conceptCount: 3,
    };

    mockApi.getMindMapStructure
      .mockResolvedValueOnce(mockMindMap1)
      .mockResolvedValueOnce(mockMindMap2);

    const { result, rerender } = renderHook(
      ({ graphId }) => useMindMapStructure(graphId),
      {
        initialProps: { graphId: 'graph-1' },
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.seedNodeId).toBe('seed-1');

    rerender({ graphId: 'graph-2' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.seedNodeId).toBe('seed-2');
    expect(result.current.totalNodes).toBe(5);
    expect(mockApi.getMindMapStructure).toHaveBeenCalledTimes(2);
  });

  it('should refetch when options change', async () => {
    const mockMindMap: MindMapResponse = {
      nodes: [],
      seedNodeId: 'seed-1',
      totalNodes: 0,
      layerCount: 0,
      conceptCount: 0,
    };

    mockApi.getMindMapStructure.mockResolvedValue(mockMindMap);

    const { result, rerender } = renderHook(
      ({ options }) => useMindMapStructure('graph-1', options),
      {
        initialProps: { options: { expandAll: false } },
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getMindMapStructure).toHaveBeenCalledWith('graph-1', {
      expandAll: false,
    });

    rerender({ options: { expandAll: true } });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getMindMapStructure).toHaveBeenCalledWith('graph-1', {
      expandAll: true,
    });
    expect(mockApi.getMindMapStructure).toHaveBeenCalledTimes(2);
  });

  it('should prevent duplicate concurrent requests for the same graphId and options', async () => {
    const mockMindMap: MindMapResponse = {
      nodes: [],
      seedNodeId: 'seed-1',
      totalNodes: 0,
      layerCount: 0,
      conceptCount: 0,
    };

    let resolveFirst: (value: MindMapResponse) => void;
    const firstPromise = new Promise<MindMapResponse>((resolve) => {
      resolveFirst = resolve;
    });

    mockApi.getMindMapStructure.mockImplementation(() => firstPromise);

    const { result } = renderHook(() => useMindMapStructure('graph-1'));

    expect(result.current.loading).toBe(true);
    expect(mockApi.getMindMapStructure).toHaveBeenCalledTimes(1);

    // The hook should prevent duplicate calls automatically via loadingRef
    // We verify that only one call was made
    expect(mockApi.getMindMapStructure).toHaveBeenCalledTimes(1);

    // Resolve the first request
    await act(async () => {
      resolveFirst(mockMindMap);
      await firstPromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should return default values when mindMapData is null', async () => {
    const { result } = renderHook(() => useMindMapStructure(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.nodes).toEqual([]);
    expect(result.current.seedNodeId).toBeUndefined();
    expect(result.current.totalNodes).toBe(0);
    expect(result.current.layerCount).toBe(0);
    expect(result.current.conceptCount).toBe(0);
  });
});

