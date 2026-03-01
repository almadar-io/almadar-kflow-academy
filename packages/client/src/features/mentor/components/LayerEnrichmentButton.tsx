import React from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { EnrichmentSuggestionsModal } from '../../enrichment/components/EnrichmentSuggestionsModal';
import { useLayerEnrichment } from '../hooks/useLayerEnrichment';
import type { EnrichmentResult } from '../../enrichment/enrichmentApi';
import { useAlert } from '../../../contexts/AlertContext';

interface LayerEnrichmentButtonProps {
  graphId: string;
  layerNumber: number;
  onConceptsAdded?: (concepts: any[]) => void;
}

const LayerEnrichmentButton: React.FC<LayerEnrichmentButtonProps> = ({
  graphId,
  layerNumber,
  onConceptsAdded,
}) => {
  const { showSuccess, showError } = useAlert();
  const {
    enrichLayer,
    applyEnrichments,
    closeModal,
    showEnrichmentModal,
    enrichmentResult,
    isEnriching,
    isApplying,
  } = useLayerEnrichment({
    graphId,
    layerNumber,
    onConceptsAdded,
  });

  const handleEnrichLayer = async () => {
    try {
      await enrichLayer();
    } catch (error: any) {
      showError(`Failed to enrich layer: ${error.message || 'Unknown error'}`);
    }
  };

  const handleApplyEnrichments = async (result: EnrichmentResult) => {
    try {
      await applyEnrichments(result);
      showSuccess(`Successfully applied enrichments! Added ${result.stats.conceptsAdded || 0} concepts and ${result.stats.relationshipsAdded || 0} relationships.`);
    } catch (error: any) {
      showError(`Failed to apply enrichments: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <>
      <button
        onClick={handleEnrichLayer}
        disabled={isEnriching}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900/70 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Enrich this layer with AI suggestions"
      >
        {isEnriching ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Enriching Layer {layerNumber}...</span>
          </>
        ) : (
          <>
            <Wand2 size={16} />
            <span>Enrich Layer {layerNumber}</span>
          </>
        )}
      </button>

      {/* Enrichment Suggestions Modal */}
      {showEnrichmentModal && enrichmentResult && (
        <EnrichmentSuggestionsModal
          isOpen={showEnrichmentModal}
          onClose={closeModal}
          enrichmentResult={enrichmentResult}
          isLoading={isEnriching}
          onApply={handleApplyEnrichments}
          isApplying={isApplying}
        />
      )}
    </>
  );
};

export default LayerEnrichmentButton;

