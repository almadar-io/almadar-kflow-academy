/**
 * InteractiveOrbitalPanel Organism Component
 *
 * Generates and renders an interactive visualization or simulation orbital
 * inside a lesson. Uses `@almadar/sdk/react` `AlmadarApp` for rendering so
 * the runtime path stays consistent with the public SDK contract.
 *
 * Event Contract:
 * - Emits: UI:GENERATE_INTERACTIVE_ORBITAL { type, success }
 */

import React, { useState, useCallback, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { OrbitalSchema } from "@almadar/core";
import { AlmadarApp } from "@almadar/sdk/react";
import {
  Box,
  VStack,
  HStack,
  Button,
  Typography,
  Card,
  useEventBus,
} from '@almadar/ui';

export interface InteractiveOrbitalPanelProps {
  /** Marker type */
  type: "chart" | "simulation";
  /** Description of what the learner should see */
  description: string;
  /** Concept context passed to the generator */
  concept: { id?: string; name: string; description?: string };
  /** Callback that generates the orbital schema */
  onGenerate: (
    request: {
      type: "chart" | "simulation";
      concept: { id?: string; name: string; description?: string };
      markerDescription: string;
    },
  ) => Promise<OrbitalSchema | null>;
  /** Whether to auto-generate when the panel mounts */
  autoGenerate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const InteractiveOrbitalPanel: React.FC<InteractiveOrbitalPanelProps> = ({
  type,
  description,
  concept,
  onGenerate,
  autoGenerate = false,
  className,
}) => {
  const eventBus = useEventBus();
  const [schema, setSchema] = useState<OrbitalSchema | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setSchema(null);

    try {
      const result = await onGenerate({ type, concept, markerDescription: description });
      setSchema(result);
      eventBus.emit("UI:GENERATE_INTERACTIVE_ORBITAL", { type, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      eventBus.emit("UI:GENERATE_INTERACTIVE_ORBITAL", { type, success: false, error: message });
    } finally {
      setIsGenerating(false);
    }
  }, [type, description, concept, onGenerate, eventBus]);

  useEffect(() => {
    if (autoGenerate) {
      handleGenerate();
    }
  }, [autoGenerate, handleGenerate]);

  return (
    <Card className={`overflow-hidden ${className || ""}`}>
      <VStack gap="md" className="p-4">
        <HStack gap="sm" justify="between" align="start">
          <VStack gap="xs" className="flex-1">
            <Typography variant="h6" className="capitalize">
              {type}
            </Typography>
            <Typography variant="small" className="text-[var(--color-muted-foreground)]">
              {description}
            </Typography>
          </VStack>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Generating…
              </span>
            ) : schema ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={16} />
                Regenerate
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} />
                Generate
              </span>
            )}
          </Button>
        </HStack>

        {error && (
          <HStack
            gap="sm"
            className="p-3 rounded-lg bg-surface text-error"
          >
            <AlertCircle size={18} />
            <Typography variant="small">{error}</Typography>
          </HStack>
        )}

        {schema && (
          <Box className="border border-border rounded-lg overflow-hidden">
            <AlmadarApp schema={schema} mode="static" height="24rem" />
          </Box>
        )}
      </VStack>
    </Card>
  );
};

InteractiveOrbitalPanel.displayName = "InteractiveOrbitalPanel";
