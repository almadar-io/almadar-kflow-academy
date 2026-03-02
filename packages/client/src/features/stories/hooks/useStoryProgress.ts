import { useState, useCallback } from 'react';
import { storyApi } from '../api/storyApi';
import { auth } from '../../../config/firebase';

interface StoryProgressRecord {
  storyId: string;
  completed: boolean;
  score: number;
  completedAt?: string;
}

interface UseStoryProgressResult {
  progress: StoryProgressRecord[];
  isLoading: boolean;
  error: string | null;
  saveProgress: (storyId: string, score: number, completed: boolean) => Promise<void>;
  fetchProgress: () => Promise<void>;
}

export function useStoryProgress(): UseStoryProgressResult {
  const [progress, setProgress] = useState<StoryProgressRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }, []);

  const fetchProgress = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const result = await storyApi.getUserProgress(token);
      const items = (result.entities ?? result.data ?? []) as StoryProgressRecord[];
      setProgress(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const saveProgress = useCallback(async (storyId: string, score: number, completed: boolean) => {
    try {
      const token = await getToken();
      if (!token) return;
      await storyApi.saveProgress(token, storyId, score, completed);
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [getToken]);

  return { progress, isLoading, error, saveProgress, fetchProgress };
}
