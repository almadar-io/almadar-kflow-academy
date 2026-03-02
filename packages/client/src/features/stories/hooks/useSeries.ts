import { useState, useEffect, useCallback } from 'react';
import { storyApi } from '../api/storyApi';
import type { SeriesSummary } from '@design-system/types/knowledge';

interface UseSeriesListResult {
  series: SeriesSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSeriesList(): UseSeriesListResult {
  const [series, setSeries] = useState<SeriesSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await storyApi.listSeries();
      const items = (result.entities ?? result.data ?? []) as SeriesSummary[];
      setSeries(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load series');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { series, isLoading, error, refetch: fetch };
}
