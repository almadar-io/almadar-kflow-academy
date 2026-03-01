/**
 * Hook for invalidating knowledge graph queries after mutations
 * 
 * Provides functions to invalidate cached data when graph operations
 * modify the data (e.g., after progressive expand, generate goals, etc.)
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { knowledgeGraphKeys } from './queryKeys';

export function useInvalidateGraph() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all queries for a specific graph
   * Use after any mutation that modifies graph data
   */
  const invalidateGraph = useCallback(async (graphId: string) => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.graph(graphId) 
    });
  }, [queryClient]);

  /**
   * Invalidate graph summary only
   * Use after operations that change stats (concept count, milestones, etc.)
   */
  const invalidateGraphSummary = useCallback(async (graphId: string) => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.graphSummary(graphId) 
    });
  }, [queryClient]);

  /**
   * Invalidate concepts by layer
   * Use after adding/removing concepts or changing layers
   */
  const invalidateConceptsByLayer = useCallback(async (graphId: string) => {
    // Invalidate all concepts-by-layer queries for this graph regardless of options
    await queryClient.invalidateQueries({ 
      queryKey: [...knowledgeGraphKeys.graph(graphId), 'concepts-by-layer']
    });
  }, [queryClient]);

  /**
   * Invalidate a specific concept detail
   * Use after updating a concept's properties
   */
  const invalidateConceptDetail = useCallback(async (graphId: string, conceptId: string) => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.conceptDetail(graphId, conceptId) 
    });
  }, [queryClient]);

  /**
   * Invalidate mindmap structure
   * Use after structural changes to the graph
   */
  const invalidateMindMap = useCallback(async (graphId: string) => {
    // Invalidate all mindmap queries for this graph regardless of options
    await queryClient.invalidateQueries({ 
      queryKey: [...knowledgeGraphKeys.graph(graphId), 'mindmap']
    });
  }, [queryClient]);

  /**
   * Invalidate all learning paths
   * Use after creating/deleting graphs
   */
  const invalidateLearningPaths = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.learningPaths() 
    });
  }, [queryClient]);

  /**
   * Invalidate everything after a major operation (like progressive expand)
   * This invalidates graph summary, concepts, and mindmap
   */
  const invalidateAfterExpand = useCallback(async (graphId: string) => {
    await Promise.all([
      invalidateGraphSummary(graphId),
      invalidateConceptsByLayer(graphId),
      invalidateMindMap(graphId),
    ]);
  }, [invalidateGraphSummary, invalidateConceptsByLayer, invalidateMindMap]);

  return {
    invalidateGraph,
    invalidateGraphSummary,
    invalidateConceptsByLayer,
    invalidateConceptDetail,
    invalidateMindMap,
    invalidateLearningPaths,
    invalidateAfterExpand,
  };
}
