import { useState, useCallback } from 'react';
import type { OrbitalSchema } from '@almadar/core';
import {
  interactiveOrbitalAPI,
  type GenerateInteractiveOrbitalRequest,
} from '../api/interactiveOrbitalAPI';

export interface UseGenerateInteractiveOrbitalReturn {
  schema: OrbitalSchema | null;
  isGenerating: boolean;
  error: string | null;
  phase: string | null;
  generate: (request: GenerateInteractiveOrbitalRequest) => Promise<OrbitalSchema | null>;
  reset: () => void;
}

export const useGenerateInteractiveOrbital = (): UseGenerateInteractiveOrbitalReturn => {
  const [schema, setSchema] = useState<OrbitalSchema | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);

  const generate = useCallback(async (request: GenerateInteractiveOrbitalRequest) => {
    setIsGenerating(true);
    setError(null);
    setSchema(null);
    setPhase(null);

    try {
      const result = await interactiveOrbitalAPI.generateStreaming(request, {
        onPhase: setPhase,
      });
      setSchema(result.schema);
      return result.schema;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate interactive orbital';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
      setPhase(null);
    }
  }, []);

  const reset = useCallback(() => {
    setSchema(null);
    setError(null);
    setIsGenerating(false);
    setPhase(null);
  }, []);

  return {
    schema,
    isGenerating,
    error,
    phase,
    generate,
    reset,
  };
};
