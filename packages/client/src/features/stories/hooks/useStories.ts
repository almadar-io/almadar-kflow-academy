import { useState, useEffect, useCallback } from 'react';
import { storyApi } from '../api/storyApi';
import type { StorySummary } from '@design-system/types/knowledge';

interface UseStoriesResult {
  stories: StorySummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStories(): UseStoriesResult {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await storyApi.listStories();
      const items = (result.entities ?? result.data ?? []) as StorySummary[];
      setStories(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stories, isLoading, error, refetch: fetch };
}
