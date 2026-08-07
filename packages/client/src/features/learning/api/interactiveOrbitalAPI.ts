import type { OrbitalSchema } from '@almadar/core';
import type { LessonSegment } from '@almadar/ui';
import { apiClient } from '../../../services/apiClient';
import { handleStreamingRequest } from '../../knowledge-graph/api/streaming';

// @almadar-io/knowledge doesn't export this type yet (server-side work in
// flight) — derive it from @almadar/ui's LessonSegment so the union has one
// source of truth instead of being hand-written a second time here.
export type InteractiveOrbitalType = Extract<
  LessonSegment,
  { type: 'visualization' }
>['visualizationType'];

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
  appId?: string;
  cached?: boolean;
}

export interface GenerateInteractiveOrbitalStreamingCallbacks {
  onPhase?: (phase: string) => void;
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

  generateStreaming: async (
    request: GenerateInteractiveOrbitalRequest,
    callbacks: GenerateInteractiveOrbitalStreamingCallbacks,
  ): Promise<GenerateInteractiveOrbitalResponse> => {
    return handleStreamingRequest<GenerateInteractiveOrbitalResponse, GenerateInteractiveOrbitalRequest>(
      '/api/generate-interactive-orbital',
      request,
      {
        onChunk: (phase) => callbacks.onPhase?.(phase),
      },
    );
  },
};
