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
  generate: (request: GenerateInteractiveOrbitalRequest) => Promise<OrbitalSchema | null>;
  reset: () => void;
}

export const useGenerateInteractiveOrbital = (): UseGenerateInteractiveOrbitalReturn => {
  const [schema, setSchema] = useState<OrbitalSchema | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (request: GenerateInteractiveOrbitalRequest) => {
    setIsGenerating(true);
    setError(null);
    setSchema(null);

    try {
      const result = await interactiveOrbitalAPI.generate(request);
      setSchema(result.schema);
      return result.schema;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate interactive orbital';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSchema(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    schema,
    isGenerating,
    error,
    generate,
    reset,
  };
};
