import { useQuery } from '@tanstack/react-query';
import { fetchCompanionPersona } from '../api/companionApi';
import type { CompanionPersonaDTO } from '@kflow-academy/shared';

export function useCompanionPersona(enabled: boolean) {
  const query = useQuery({
    queryKey: ['companion-persona'],
    queryFn: fetchCompanionPersona,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    persona: query.data ?? null,
    loading: query.isLoading,
  };
}

export type { CompanionPersonaDTO };
