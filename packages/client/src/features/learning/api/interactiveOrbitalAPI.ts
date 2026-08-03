import type { OrbitalSchema } from '@almadar/core';
import { apiClient } from '../../../services/apiClient';

export type InteractiveOrbitalType =
  | 'algorithms'
  | 'math'
  | 'physics'
  | 'biology'
  | 'chemistry'
  | 'probability'
  | 'freeform';

export interface GenerateInteractiveOrbitalRequest {
  type: InteractiveOrbitalType;
  concept: {
    id?: string;
    name: string;
    description?: string;
  };
  markerDescription: string;
}

export interface GenerateInteractiveOrbitalResponse {
  schema: OrbitalSchema;
}

export const interactiveOrbitalAPI = {
  generate: async (
    request: GenerateInteractiveOrbitalRequest,
  ): Promise<GenerateInteractiveOrbitalResponse> => {
    return apiClient.fetch('/api/generate-interactive-orbital', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};
