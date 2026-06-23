import { useQuery } from '@tanstack/react-query';
import { getJumpBackInItems, type JumpBackInItem } from '../preferencesApi';

export const JUMP_BACK_IN_QUERY_KEY = ['jumpBackIn'] as const;

export function useJumpBackIn() {
  const query = useQuery<JumpBackInItem[]>({
    queryKey: JUMP_BACK_IN_QUERY_KEY,
    queryFn: getJumpBackInItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
