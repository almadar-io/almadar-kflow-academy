/**
 * Hook for graph enrichment operations
 * 
 * Provides state management and API calls for enriching knowledge graphs.
 */

import { useState, useCallback } from 'react';
import { enrichmentApi, type EnrichmentOptions, type EnrichmentResult } from '../enrichmentApi';

interface UseGraphEnrichmentOptions {
  graphId: string;
}

export function useGraphEnrichment({ graphId }: UseGraphEnrichmentOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [streamingEnrichments, setStreamingEnrichments] = useState<any[]>([]);

  const enrich = useCallback(
    async (options: EnrichmentOptions, onStream?: (enrichment: any) => void) => {
      if (isLoading) return; // Prevent double calls

      setIsLoading(true);
      setError(null);
      setResult(null);
      setStreamingEnrichments([]);

      try {
        // Only use streaming if stream option is enabled and callback is provided
        const shouldStream = options.stream !== false && onStream !== undefined;
        
        const enrichmentResult = await enrichmentApi.enrichGraph(
          graphId, 
          { ...options, stream: shouldStream },
          shouldStream ? (enrichment) => {
            setStreamingEnrichments(prev => [...prev, enrichment]);
            onStream?.(enrichment);
          } : undefined
        );
        setResult(enrichmentResult);
        return enrichmentResult;
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to enrich graph';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [graphId, isLoading]
  );

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    enrich,
    isLoading,
    error,
    result,
    streamingEnrichments,
    reset,
  };
}

