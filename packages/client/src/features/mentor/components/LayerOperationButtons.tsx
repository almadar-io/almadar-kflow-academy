import React, { useState } from 'react';
import { Concept } from '../types';
import { 
  Network,
  FileText,
  Sparkles,
  Loader2,
  Wand2
} from 'lucide-react';
import { OperationType, OperationResult } from '../hooks/useMentorOperations';
import { ConceptsDiffModal } from './index';
import { ConceptDiff } from '../mentorSlice';
import { EnrichmentSuggestionsModal } from '../../enrichment/components/EnrichmentSuggestionsModal';
import { useLayerEnrichment } from '../hooks/useLayerEnrichment';
import type { EnrichmentResult } from '../../enrichment/enrichmentApi';
import { useAlert } from '../../../contexts/AlertContext';

interface LayerOperationButtonsProps {
  level: number;
  concepts: Concept[];
  onOperation: (operation: OperationType, concept: Concept | Concept[], ...args: any[]) => Promise<OperationResult>;
  isLoading?: boolean;
  conceptMap?: Map<string, Concept>;
  onConceptsAdded?: (concepts: Concept[]) => void;
  onOpenCustomPanel?: (concepts: Concept[], primaryConcept?: Concept) => void;
  graphId?: string;
  layerNumber?: number; // The actual layer number (1-based)
}

const LayerOperationButtons: React.FC<LayerOperationButtonsProps> = ({
  level,
  concepts,
  onOperation,
  isLoading = false,
  conceptMap,
  onConceptsAdded,
  onOpenCustomPanel,
  graphId,
  layerNumber,
}) => {
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [diff, setDiff] = useState<ConceptDiff | null>(null);
  const [lastOperationName, setLastOperationName] = useState<string>('');
  const [showDiffModal, setShowDiffModal] = useState(false);
  const { showSuccess, showError } = useAlert();

  // Layer enrichment hook
  const {
    enrichLayer,
    applyEnrichments,
    closeModal,
    showEnrichmentModal,
    enrichmentResult,
    isEnriching,
    isApplying,
  } = useLayerEnrichment({
    graphId: graphId || '',
    layerNumber: layerNumber || 0,
    onConceptsAdded,
  });

  const handleOperation = async (
    operation: OperationType,
    ...args: any[]
  ) => {
    setOperationLoading(operation);
    try {
      // For layer operations, pass all concepts in the layer
      const result = await onOperation(operation, concepts, ...args);
      if (result && result.diff) {
        setDiff(result.diff);
        setLastOperationName(operation);
        setShowDiffModal(true);
      }
    } catch (error) {
      console.error(`Error executing ${operation}:`, error);
      alert(`Failed to execute ${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleEnrichLayer = async () => {
    if (!graphId || !layerNumber) {
      showError('Graph ID and layer number are required for enrichment');
      return;
    }

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

  const buttonClass = "px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5";
  const secondaryButtonClass = `${buttonClass} bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600`;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {/* <button
          onClick={() => handleOperation('progressiveExplore')}
          disabled={isLoading || operationLoading !== null}
          className={secondaryButtonClass}
          title="Generate additional related concepts in the same layer"
        >
          {operationLoading === 'progressiveExplore' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Network size={14} />
          )}
          Explore Layer
        </button> */}

        {/* <button
          onClick={() => handleOperation('deriveSummary')}
          disabled={isLoading || operationLoading !== null}
          className={secondaryButtonClass}
          title="Generate summary concepts for this layer"
        >
          {operationLoading === 'deriveSummary' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          Summarize
        </button> */}

                    <button
                      onClick={() => {
                        if (onOpenCustomPanel) {
                          onOpenCustomPanel(concepts, concepts[0]);
                        }
                      }}
                      disabled={isLoading || operationLoading !== null}
                      className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 bg-purple-200 text-purple-700 hover:bg-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                      title="Custom operation with natural language prompt"
                    >
                      {operationLoading === 'custom' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      Custom
                    </button>

                    {/* Enrich Layer Button */}
                    {graphId && layerNumber && (
                      <button
                        onClick={handleEnrichLayer}
                        disabled={isLoading || operationLoading !== null || isEnriching}
                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 bg-indigo-200 text-indigo-700 hover:bg-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                        title="Enrich this layer with AI suggestions"
                      >
                        {isEnriching ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Wand2 size={14} />
                        )}
                        Enrich Layer
                      </button>
                    )}
      </div>

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

      {showDiffModal && (
        <ConceptsDiffModal
          diff={diff}
          operationName={lastOperationName}
          onClose={() => setShowDiffModal(false)}
          onConceptsAdded={onConceptsAdded}
        />
      )}
    </>
  );
};

export default LayerOperationButtons;

