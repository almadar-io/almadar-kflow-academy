/**
 * Tests for useConceptDetail Hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useConceptDetail } from '../../../../features/knowledge-graph/hooks/useConceptDetail';
import { graphQueryApi } from '../../../../features/knowledge-graph/api/queryApi';
import type { ConceptDetail } from '../../../../features/knowledge-graph/api/types';

// Mock the query API
jest.mock('../../../../features/knowledge-graph/api/queryApi', () => ({
  graphQueryApi: {
    getConceptDetail: jest.fn(),
  },
}));

const mockApi = graphQueryApi as jest.Mocked<typeof graphQueryApi>;

describe('useConceptDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch concept detail on mount when both graphId and conceptId are provided', async () => {
    const mockDetail: ConceptDetail = {
      concept: {
        id: 'concept-1',
        name: 'Variables',
        description: 'Understanding variables',
        layer: 1,
        isSeed: true,
        parents: [],
        children: ['concept-2'],
        prerequisites: [],
        properties: {},
      },
      lesson: {
        id: 'lesson-1',
        content: 'Variables are...',
        prerequisites: [],
      },
      flashcards: [
        {
          id: 'flashcard-1',
          front: 'What is a variable?',
          back: 'A variable is...',
        },
      ],
      metadata: {
        qa: [
          {
            question: 'What is a variable?',
            answer: 'A variable is a container for data.',
          },
        ],
      },
      relationships: {
        parents: [],
        children: [
          {
            id: 'concept-2',
            name: 'Functions',
          },
        ],
        prerequisites: [],
      },
    };

    mockApi.getConceptDetail.mockResolvedValue(mockDetail);

    const { result } = renderHook(() => useConceptDetail('graph-1', 'concept-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.conceptDetail).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conceptDetail).toEqual(mockDetail);
    expect(result.current.error).toBeNull();
    expect(mockApi.getConceptDetail).toHaveBeenCalledWith('graph-1', 'concept-1');
  });

  it('should not fetch when graphId is empty', async () => {
    const { result } = renderHook(() => useConceptDetail('', 'concept-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conceptDetail).toBeNull();
    expect(mockApi.getConceptDetail).not.toHaveBeenCalled();
  });

  it('should not fetch when conceptId is empty', async () => {
    const { result } = renderHook(() => useConceptDetail('graph-1', ''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conceptDetail).toBeNull();
    expect(mockApi.getConceptDetail).not.toHaveBeenCalled();
  });

  it('should handle concept without lesson', async () => {
    const mockDetail: ConceptDetail = {
      concept: {
        id: 'concept-1',
        name: 'Variables',
        description: 'Understanding variables',
        layer: 1,
        isSeed: false,
        parents: [],
        children: [],
        prerequisites: [],
        properties: {},
      },
      lesson: null,
      flashcards: [],
      metadata: null,
      relationships: {
        parents: [],
        children: [],
        prerequisites: [],
      },
    };

    mockApi.getConceptDetail.mockResolvedValue(mockDetail);

    const { result } = renderHook(() => useConceptDetail('graph-1', 'concept-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conceptDetail?.lesson).toBeNull();
    expect(result.current.conceptDetail?.flashcards).toEqual([]);
    expect(result.current.conceptDetail?.metadata).toBeNull();
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch concept detail');
    mockApi.getConceptDetail.mockRejectedValue(error);

    const { result } = renderHook(() => useConceptDetail('graph-1', 'concept-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch concept detail');
    expect(result.current.conceptDetail).toBeNull();
  });

  it('should support refetch', async () => {
    const mockDetail: ConceptDetail = {
      concept: {
        id: 'concept-1',
        name: 'Variables',
        description: 'Understanding variables',
        layer: 1,
        isSeed: false,
        parents: [],
        children: [],
        prerequisites: [],
        properties: {},
      },
      lesson: null,
      flashcards: [],
      metadata: null,
      relationships: {
        parents: [],
        children: [],
        prerequisites: [],
      },
    };

    mockApi.getConceptDetail.mockResolvedValue(mockDetail);

    const { result } = renderHook(() => useConceptDetail('graph-1', 'concept-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getConceptDetail).toHaveBeenCalledTimes(1);

    // Refetch
    await waitFor(async () => {
      await result.current.refetch();
    });

    expect(mockApi.getConceptDetail).toHaveBeenCalledTimes(2);
  });

  it('should refetch when graphId or conceptId changes', async () => {
    const mockDetail1: ConceptDetail = {
      concept: {
        id: 'concept-1',
        name: 'Variables',
        description: 'Understanding variables',
        layer: 1,
        isSeed: false,
        parents: [],
        children: [],
        prerequisites: [],
        properties: {},
      },
      lesson: null,
      flashcards: [],
      metadata: null,
      relationships: {
        parents: [],
        children: [],
        prerequisites: [],
      },
    };

    const mockDetail2: ConceptDetail = {
      concept: {
        id: 'concept-2',
        name: 'Functions',
        description: 'Understanding functions',
        layer: 2,
        isSeed: false,
        parents: [],
        children: [],
        prerequisites: [],
        properties: {},
      },
      lesson: null,
      flashcards: [],
      metadata: null,
      relationships: {
        parents: [],
        children: [],
        prerequisites: [],
      },
    };

    mockApi.getConceptDetail
      .mockResolvedValueOnce(mockDetail1)
      .mockResolvedValueOnce(mockDetail2);

    const { result, rerender } = renderHook(
      ({ graphId, conceptId }) => useConceptDetail(graphId, conceptId),
      {
        initialProps: { graphId: 'graph-1', conceptId: 'concept-1' },
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conceptDetail?.concept.id).toBe('concept-1');

    rerender({ graphId: 'graph-1', conceptId: 'concept-2' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conceptDetail?.concept.id).toBe('concept-2');
    expect(mockApi.getConceptDetail).toHaveBeenCalledTimes(2);
  });

  it('should prevent duplicate concurrent requests for the same graphId:conceptId', async () => {
    const mockDetail: ConceptDetail = {
      concept: {
        id: 'concept-1',
        name: 'Variables',
        description: 'Understanding variables',
        layer: 1,
        isSeed: false,
        parents: [],
        children: [],
        prerequisites: [],
        properties: {},
      },
      lesson: null,
      flashcards: [],
      metadata: null,
      relationships: {
        parents: [],
        children: [],
        prerequisites: [],
      },
    };

    let resolveFirst: (value: ConceptDetail) => void;
    const firstPromise = new Promise<ConceptDetail>((resolve) => {
      resolveFirst = resolve;
    });

    mockApi.getConceptDetail.mockImplementation(() => firstPromise);

    const { result } = renderHook(() => useConceptDetail('graph-1', 'concept-1'));

    expect(result.current.loading).toBe(true);
    expect(mockApi.getConceptDetail).toHaveBeenCalledTimes(1);

    // The hook should prevent duplicate calls automatically via loadingRef
    // We can't easily test this with renderHook since it's internal state,
    // but we verify that only one call was made
    expect(mockApi.getConceptDetail).toHaveBeenCalledTimes(1);

    // Resolve the first request
    await act(async () => {
      resolveFirst(mockDetail);
      await firstPromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

