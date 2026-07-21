/**
 * Wikipedia lead image for a concept/topic, Firestore-cached server-side.
 * Used by learning-path cards to show a representative image of the knowledge
 * itself (instead of a generic book icon). staleTime Infinity — images are
 * stable, and the server caches misses too.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../services/apiClient';
import { knowledgeGraphKeys } from './queryKeys';

async function fetchConceptImage(label: string): Promise<string | null> {
  const data = await apiClient.fetch(`/api/concept-image?label=${encodeURIComponent(label)}`);
  const { url } = (await data.json()) as { url?: string | null };
  return url ?? null;
}

export function useConceptImage(label: string | undefined | null): string | null | undefined {
  const query = useQuery({
    queryKey: knowledgeGraphKeys.conceptImage(label ?? ''),
    queryFn: () => fetchConceptImage(label as string),
    enabled: !!label?.trim(),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
  return query.data;
}
