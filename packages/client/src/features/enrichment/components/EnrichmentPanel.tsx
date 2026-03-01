/**
 * Enrichment Panel Component
 * 
 * UI component for triggering graph enrichment strategies.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { useGraphEnrichment } from '../hooks/useGraphEnrichment';
import { EnrichmentSuggestionsModal } from './EnrichmentSuggestionsModal';
import { enrichmentApi } from '../enrichmentApi';
import type { EnrichmentOptions, EnrichmentResult } from '../enrichmentApi';

interface EnrichmentPanelProps {
  graphId: string;
  onEnrichmentComplete?: () => void;
  onEnrichmentStart?: () => void;
}

export function EnrichmentPanel({ graphId, onEnrichmentComplete, onEnrichmentStart }: EnrichmentPanelProps) {
  const { enrich, isLoading, error, result } = useGraphEnrichment({ graphId });
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastUsedOptions, setLastUsedOptions] = useState<EnrichmentOptions | null>(null);
  const [streamingResult, setStreamingResult] = useState<EnrichmentResult | null>(null);
  const [selectedStrategies, setSelectedStrategies] = useState<EnrichmentOptions>({
    analyzeLayers: false,
    discoverMissingConcepts: false,
    analyzePrerequisites: false,
    discoverRelationships: false,
    discoverCrossLayer: false,
    autoApply: false,
  });
  const [enableStreaming, setEnableStreaming] = useState(true); // Default to streaming enabled

  const handleStrategyToggle = (strategy: keyof EnrichmentOptions) => {
    setSelectedStrategies(prev => ({
      ...prev,
      [strategy]: !prev[strategy],
    }));
  };

  const handleEnrich = async () => {
    try {
      setLastUsedOptions(selectedStrategies);
      setStreamingResult(null);
      
      // Open modal if streaming is enabled, otherwise wait for result
      if (enableStreaming) {
        setShowSuggestionsModal(true);
      }
      onEnrichmentStart?.();
      
      // Use streaming if enabled, otherwise use regular request
      const optionsWithStreaming = { ...selectedStrategies, stream: enableStreaming };
      
      if (enableStreaming) {
        await enrich(optionsWithStreaming, (enrichment) => {
          // Update streaming result as enrichments come in real-time
          setStreamingResult((prev: EnrichmentResult | null) => {
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
        });
      } else {
        // Non-streaming: wait for complete result, then show modal
        await enrich(optionsWithStreaming);
        setShowSuggestionsModal(true);
      }
      
      // Final result will be set by the hook
      onEnrichmentComplete?.();
    } catch (err) {
      // Error is handled by the hook
      console.error('Enrichment failed:', err);
    }
  };

  const hasSelectedStrategy = Object.values(selectedStrategies).some(v => v === true);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Graph Enrichment
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use AI to enhance your knowledge graph
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedStrategies.analyzeLayers}
            onChange={() => handleStrategyToggle('analyzeLayers')}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Layer Completeness Analysis
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Analyze if layers are complete for their milestones
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedStrategies.discoverMissingConcepts}
            onChange={() => handleStrategyToggle('discoverMissingConcepts')}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Milestone-Driven Concept Discovery
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Find missing concepts needed for milestones
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedStrategies.analyzePrerequisites}
            onChange={() => handleStrategyToggle('analyzePrerequisites')}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Prerequisite Chain Analysis
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Analyze complete prerequisite chains for concepts
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedStrategies.discoverRelationships}
            onChange={() => handleStrategyToggle('discoverRelationships')}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Goal-Aware Relationship Discovery
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Discover relationships relevant to learning goals
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedStrategies.discoverCrossLayer}
            onChange={() => handleStrategyToggle('discoverCrossLayer')}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Cross-Layer Concept Discovery
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Find bridging concepts across layers
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedStrategies.autoApply}
            onChange={() => handleStrategyToggle('autoApply')}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Auto-Apply Enrichments
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Automatically apply suggested enrichments to the graph
            </div>
          </div>
        </label>

        {/* Streaming Toggle */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableStreaming}
              onChange={(e) => setEnableStreaming(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                Enable Streaming
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Stream enrichment results in real-time (recommended for better UX)
              </div>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <XCircle className="text-red-600 dark:text-red-400" size={16} />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {result && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={16} />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Enrichment Complete
              </span>
            </div>
            {!result.applied && (
              <button
                onClick={() => setShowSuggestionsModal(true)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Eye size={14} />
                View Suggestions
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {result.enrichments.length} enrichment result(s) generated
            {result.applied && result.stats.conceptsAdded !== undefined && (
              <span className="ml-2">
                • {result.stats.conceptsAdded} concepts added
              </span>
            )}
          </div>
        </div>
      )}

      {/* Enrichment Suggestions Modal */}
      {(result || streamingResult) && (
        <EnrichmentSuggestionsModal
          isOpen={showSuggestionsModal}
          onClose={() => setShowSuggestionsModal(false)}
          enrichmentResult={result || streamingResult}
          isLoading={isLoading}
          onApply={async (enrichmentResult) => {
            setIsApplying(true);
            try {
              // Apply the existing enrichments directly using the new API
              const applyResult = await enrichmentApi.applyEnrichments(
                graphId,
                enrichmentResult.enrichments
              );
              
              // Update the result to reflect applied state
              if (result) {
                // The result is managed by the hook, so we'll just close the modal
                // The user can refresh to see the updated graph
              }
              
              setShowSuggestionsModal(false);
              alert(`Successfully applied enrichments! Added ${applyResult.stats.conceptsAdded} concepts and ${applyResult.stats.relationshipsAdded} relationships.`);
              onEnrichmentComplete?.();
            } catch (err: any) {
              console.error('Failed to apply enrichments:', err);
              alert(err.message || 'Failed to apply enrichments');
            } finally {
              setIsApplying(false);
            }
          }}
          isApplying={isApplying}
        />
      )}

      <button
        onClick={handleEnrich}
        disabled={!hasSelectedStrategy || isLoading}
        className="w-full px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            <span>Enriching...</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span>Run Enrichment</span>
          </>
        )}
      </button>
    </div>
  );
}

