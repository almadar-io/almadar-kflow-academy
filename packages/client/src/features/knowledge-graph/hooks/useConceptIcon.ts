/**
 * Iconify icon (id + color tone) for a concept/topic, Firestore-cached server-side. Used by
 * learning-path cards to show the topic's real logo (devicon) or a representative icon
 * instead of a generic book icon. The `tone` lets the card pick a contrasting background
 * (dark icon → light tile, light icon → dark tile, themed → tinted). staleTime Infinity.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../services/apiClient';
import { knowledgeGraphKeys } from './queryKeys';

export type IconTone = 'themed' | 'dark' | 'light';
export interface ConceptIcon { icon: string; tone: IconTone; }

async function fetchConceptIcon(label: string): Promise<ConceptIcon | null> {
  const data = (await apiClient.fetch(`/api/concept-icon?label=${encodeURIComponent(label)}`)) as
    { icon?: string | null; tone?: IconTone | null };
  if (!data.icon || !data.tone) return null;
  return { icon: data.icon, tone: data.tone };
}

export function useConceptIcon(label: string | undefined | null): ConceptIcon | null | undefined {
  const query = useQuery({
    queryKey: knowledgeGraphKeys.conceptIcon(label ?? ''),
    queryFn: () => fetchConceptIcon(label as string),
    enabled: !!label?.trim(),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
  return query.data;
}
