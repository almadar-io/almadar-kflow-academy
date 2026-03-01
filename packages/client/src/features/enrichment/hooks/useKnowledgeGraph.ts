/**
 * Hook for fetching KnowledgeGraph
 * 
 * Provides state management and API calls for fetching knowledge graphs.
 * Prevents double API calls with loading state guard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { enrichmentApi } from '../enrichmentApi';

interface UseKnowledgeGraphOptions {
  graphId: string | null | undefined;
  enabled?: boolean;
}

export function useKnowledgeGraph({ graphId, enabled = true }: UseKnowledgeGraphOptions) {
  const [knowledgeGraph, setKnowledgeGraph] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const currentGraphIdRef = useRef<string | null | undefined>(null);
  const isLoadingRef = useRef(false);

  // Reset when graphId changes
  useEffect(() => {
    if (currentGraphIdRef.current !== graphId) {
      hasFetchedRef.current = false;
      currentGraphIdRef.current = graphId;
      setKnowledgeGraph(null);
      setError(null);
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [graphId]);

  // Fetch on mount or when graphId/enabled changes
  useEffect(() => {
    if (!graphId || !enabled) {
      setKnowledgeGraph(null);
      return;
    }

    // Prevent double calls for the same graphId
    if (isLoadingRef.current || (hasFetchedRef.current && currentGraphIdRef.current === graphId)) {
      return;
    }

    const fetchKnowledgeGraph = async () => {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      hasFetchedRef.current = true;
      currentGraphIdRef.current = graphId;

      try {
        const kg = await enrichmentApi.getKnowledgeGraph(graphId);
        setKnowledgeGraph(kg);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to fetch knowledge graph';
        setError(errorMessage);
        setKnowledgeGraph(null);
        hasFetchedRef.current = false; // Allow retry on error
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    };

    fetchKnowledgeGraph();
  }, [graphId, enabled]);

  const refresh = useCallback(() => {
    hasFetchedRef.current = false;
    isLoadingRef.current = false;
    setIsLoading(false);
    setError(null);
    
    if (graphId && enabled) {
      const fetchKnowledgeGraph = async () => {
        isLoadingRef.current = true;
        setIsLoading(true);
        hasFetchedRef.current = true;
        currentGraphIdRef.current = graphId;

        try {
          const kg = await enrichmentApi.getKnowledgeGraph(graphId);
          setKnowledgeGraph(kg);
        } catch (err: any) {
          const errorMessage = err.message || 'Failed to fetch knowledge graph';
          setError(errorMessage);
          setKnowledgeGraph(null);
          hasFetchedRef.current = false;
        } finally {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      };
      
      fetchKnowledgeGraph();
    }
  }, [graphId, enabled]);

  return {
    knowledgeGraph,
    isLoading,
    error,
    refresh,
  };
}

