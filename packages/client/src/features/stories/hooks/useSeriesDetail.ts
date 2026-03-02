import { useState, useEffect, useCallback } from 'react';
import { storyApi } from '../api/storyApi';
import type { SeriesViewEntity } from '@design-system/organisms/SeriesViewBoard';

interface UseSeriesDetailResult {
  seriesView: SeriesViewEntity | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSeriesDetail(seriesId: string | undefined): UseSeriesDetailResult {
  const [seriesView, setSeriesView] = useState<SeriesViewEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!seriesId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await storyApi.getSeries(seriesId);
      const entity = result.entity ?? result.data ?? null;
      if (entity) {
        setSeriesView({
          series: entity,
          storyMap: {},
          isSubscribed: false,
        } as SeriesViewEntity);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load series');
    } finally {
      setIsLoading(false);
    }
  }, [seriesId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { seriesView, isLoading, error, refetch: fetch };
}
