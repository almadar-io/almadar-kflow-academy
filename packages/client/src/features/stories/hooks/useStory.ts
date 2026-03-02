import { useState, useEffect, useCallback } from 'react';
import { storyApi } from '../api/storyApi';
import type { KnowledgeStoryEntity } from '@design-system/organisms/KnowledgeStoryBoard';

interface UseStoryResult {
  story: KnowledgeStoryEntity | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStory(storyId: string | undefined): UseStoryResult {
  const [story, setStory] = useState<KnowledgeStoryEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!storyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await storyApi.getStory(storyId);
      const entity = (result.entity ?? result.data ?? null) as KnowledgeStoryEntity | null;
      if (entity) {
        setStory({ ...entity, currentStep: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story');
    } finally {
      setIsLoading(false);
    }
  }, [storyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { story, isLoading, error, refetch: fetch };
}
