import { useState, useCallback } from 'react';
import { enrichmentApi, type EnrichmentOptions, type EnrichmentResult } from '../../enrichment/enrichmentApi';

interface UseLayerEnrichmentOptions {
  graphId: string;
  layerNumber: number;
  onEnrichmentComplete?: (result: EnrichmentResult) => void;
  onConceptsAdded?: (concepts: any[]) => void;
}

export const useLayerEnrichment = ({
  graphId,
  layerNumber,
  onEnrichmentComplete,
  onConceptsAdded,
}: UseLayerEnrichmentOptions) => {
  const [showEnrichmentModal, setShowEnrichmentModal] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const enrichLayer = useCallback(async (options?: Partial<EnrichmentOptions>) => {
    setIsEnriching(true);
    setEnrichmentResult(null);
    setShowEnrichmentModal(true);

    try {
      const enrichmentOptions: EnrichmentOptions = {
        analyzeLayers: true, // Default to layer analysis for layer-specific enrichment
        discoverMissingConcepts: false,
        analyzePrerequisites: false,
        discoverRelationships: false,
        discoverCrossLayer: false,
        autoApply: false,
        stream: true,
        ...options,
      };

      const result = await enrichmentApi.enrichLayer(
        graphId,
        layerNumber,
        enrichmentOptions,
        (enrichment) => {
          // Update result as enrichments stream in
          setEnrichmentResult((prev: EnrichmentResult | null) => {
            if (!prev) {
              return {
                graphId,
                enrichments: [enrichment],
                applied: false,
                stats: { conceptsAdded: 0, relationshipsAdded: 0 },
              };
            }
            return {
              ...prev,
              enrichments: [...prev.enrichments, enrichment],
            };
          });
        }
      );

      setEnrichmentResult(result);
      onEnrichmentComplete?.(result);
      return result;
    } catch (error: any) {
      console.error('Error enriching layer:', error);
      throw error;
    } finally {
      setIsEnriching(false);
    }
  }, [graphId, layerNumber, onEnrichmentComplete]);

  const applyEnrichments = useCallback(async (result: EnrichmentResult) => {
    setIsApplying(true);
    try {
      await enrichmentApi.applyEnrichments(graphId, result.enrichments);
      setShowEnrichmentModal(false);
      setEnrichmentResult(null);
      onConceptsAdded?.([]); // Trigger refresh
      return true;
    } catch (error: any) {
      console.error('Failed to apply enrichments:', error);
      throw error;
    } finally {
      setIsApplying(false);
    }
  }, [graphId, onConceptsAdded]);

  const closeModal = useCallback(() => {
    setShowEnrichmentModal(false);
    setEnrichmentResult(null);
  }, []);

  return {
    enrichLayer,
    applyEnrichments,
    closeModal,
    showEnrichmentModal,
    enrichmentResult,
    isEnriching,
    isApplying,
  };
};

