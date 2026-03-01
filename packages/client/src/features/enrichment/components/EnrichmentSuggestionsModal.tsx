/**
 * Enrichment Suggestions Modal
 * 
 * Displays enrichment suggestions in a nice visual format with the ability to apply them.
 */

import React, { useState, useMemo } from 'react';
import Modal from '../../../components/Modal';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  Layers,
  Target,
  Network,
  GitBranch,
  Link as LinkIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Check
} from 'lucide-react';
import PromptDisplayModal from '../../mentor/components/PromptDisplayModal';
import type { EnrichmentResult } from '../enrichmentApi';

interface EnrichmentSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrichmentResult: EnrichmentResult | null;
  onApply: (enrichmentResult: EnrichmentResult) => Promise<void>;
  isApplying?: boolean;
  isLoading?: boolean; // Whether enrichment is still streaming/loading
}

type EnrichmentType = 
  | 'LayerCompletenessAnalysis'
  | 'MilestoneConceptDiscovery'
  | 'PrerequisiteAnalysis'
  | 'GoalAwareRelationships'
  | 'CrossLayerDiscovery';

const getEnrichmentType = (enrichment: any): EnrichmentType => {
  if ('isComplete' in enrichment) return 'LayerCompletenessAnalysis';
  if ('missingConcepts' in enrichment && 'missingRelationships' in enrichment) return 'MilestoneConceptDiscovery';
  if ('directPrerequisites' in enrichment) return 'PrerequisiteAnalysis';
  if ('complementaryRelationships' in enrichment) return 'GoalAwareRelationships';
  if ('bridgingConcepts' in enrichment) return 'CrossLayerDiscovery';
  return 'LayerCompletenessAnalysis';
};

const getEnrichmentTitle = (type: EnrichmentType): string => {
  const titles: Record<EnrichmentType, string> = {
    LayerCompletenessAnalysis: 'Layer Completeness Analysis',
    MilestoneConceptDiscovery: 'Milestone-Driven Concept Discovery',
    PrerequisiteAnalysis: 'Prerequisite Chain Analysis',
    GoalAwareRelationships: 'Goal-Aware Relationship Discovery',
    CrossLayerDiscovery: 'Cross-Layer Concept Discovery',
  };
  return titles[type];
};

const getEnrichmentIcon = (type: EnrichmentType) => {
  const icons: Record<EnrichmentType, React.ReactNode> = {
    LayerCompletenessAnalysis: <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />,
    MilestoneConceptDiscovery: <Target size={16} className="text-indigo-600 dark:text-indigo-400" />,
    PrerequisiteAnalysis: <GitBranch size={16} className="text-indigo-600 dark:text-indigo-400" />,
    GoalAwareRelationships: <Network size={16} className="text-indigo-600 dark:text-indigo-400" />,
    CrossLayerDiscovery: <LinkIcon size={16} className="text-indigo-600 dark:text-indigo-400" />,
  };
  return icons[type];
};

const PriorityBadge: React.FC<{ priority: 'high' | 'medium' | 'low' }> = ({ priority }) => {
  const colors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
};

export function EnrichmentSuggestionsModal({
  isOpen,
  onClose,
  enrichmentResult,
  onApply,
  isApplying = false,
  isLoading = false,
}: EnrichmentSuggestionsModalProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showJsonResponse, setShowJsonResponse] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>();

  // Group enrichments by type
  const groupedEnrichments = useMemo(() => {
    if (!enrichmentResult) return {} as Record<EnrichmentType, any[]>;
    
    const groups: Record<EnrichmentType, any[]> = {
      LayerCompletenessAnalysis: [],
      MilestoneConceptDiscovery: [],
      PrerequisiteAnalysis: [],
      GoalAwareRelationships: [],
      CrossLayerDiscovery: [],
    };

    enrichmentResult.enrichments.forEach((enrichment, index) => {
      const type = getEnrichmentType(enrichment);
      groups[type].push({ ...enrichment, _index: index });
    });

    return groups;
  }, [enrichmentResult]);

  // Count total suggestions
  const totalSuggestions = useMemo(() => {
    if (!enrichmentResult) return 0;
    
    let count = 0;
    enrichmentResult.enrichments.forEach(enrichment => {
      const type = getEnrichmentType(enrichment);
      
      if (type === 'LayerCompletenessAnalysis') {
        count += (enrichment as any).missingConcepts?.length || 0;
        count += (enrichment as any).missingRelationships?.length || 0;
        count += (enrichment as any).metadata?.suggestedAdditions?.length || 0;
      } else if (type === 'MilestoneConceptDiscovery') {
        count += (enrichment as any).missingConcepts?.length || 0;
        count += (enrichment as any).missingRelationships?.length || 0;
      } else if (type === 'PrerequisiteAnalysis') {
        count += (enrichment as any).directPrerequisites?.filter((p: any) => !p.existsInGraph).length || 0;
        count += (enrichment as any).indirectPrerequisites?.filter((p: any) => !p.existsInGraph).length || 0;
        count += (enrichment as any).suggestedPrerequisites?.length || 0;
      } else if (type === 'GoalAwareRelationships') {
        count += (enrichment as any).complementaryRelationships?.length || 0;
        count += (enrichment as any).sequentialRelationships?.length || 0;
        count += (enrichment as any).hierarchicalRelationships?.length || 0;
      } else if (type === 'CrossLayerDiscovery') {
        count += (enrichment as any).bridgingConcepts?.length || 0;
        count += (enrichment as any).missingFoundations?.length || 0;
      }
    });
    
    return count;
  }, [enrichmentResult]);

  const handleApply = async () => {
    if (!enrichmentResult) return;
    await onApply(enrichmentResult);
  };

  // Show modal even if no results yet (during streaming)
  if (!enrichmentResult && !isLoading) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enrichment Suggestions"
      size="extra-large"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Enrichment Summary
            </h4>
            {isLoading && (
              <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={16} />
            )}
          </div>
          {enrichmentResult ? (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Suggestions:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{totalSuggestions}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Strategies Run:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{enrichmentResult.enrichments.length}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                  {enrichmentResult.applied ? 'Applied' : isLoading ? 'Streaming...' : 'Pending'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="animate-spin inline-block mr-2" size={14} />
              Starting enrichment analysis...
            </div>
          )}
        </div>

        {/* Enrichment Groups */}
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {!enrichmentResult && isLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Loader2 className="animate-spin inline-block mr-2" size={20} />
              <p>Waiting for enrichment results...</p>
            </div>
          )}
          {enrichmentResult && Object.entries(groupedEnrichments).map(([type, enrichments]: [string, any[]]) => {
            if (enrichments.length === 0) return null;
            
            const enrichmentType = type as EnrichmentType;
            
            return (
              <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  {getEnrichmentIcon(enrichmentType)}
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {getEnrichmentTitle(enrichmentType)}
                  </h4>
                  <span className="ml-auto px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                    {enrichments.length} result{enrichments.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {enrichments.map((enrichment: any, idx: number) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    {/* Layer Completeness Analysis */}
                    {enrichmentType === 'LayerCompletenessAnalysis' && (
                      <div className="space-y-3">
                        {enrichment.metadata?.completenessScore !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Completeness: {Math.round((enrichment.metadata.completenessScore || 0) * 100)}%
                            </span>
                            {enrichment.metadata.isComplete && (
                              <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        )}
                        
                        {enrichment.missingRelationships && enrichment.missingRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Relationships ({enrichment.missingRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.missingRelationships.map((rel: any, rIdx: number) => (
                                <div key={rIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center gap-2">
                                    <ArrowRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.source}
                                    </span>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.target}
                                    </span>
                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded text-xs">
                                      {rel.type}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {rel.reason}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {enrichment.missingConcepts && enrichment.missingConcepts.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Concepts ({enrichment.missingConcepts.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.missingConcepts.map((concept: any, cIdx: number) => (
                                <div key={cIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                          {concept.name}
                                        </span>
                                        {concept.priority && <PriorityBadge priority={concept.priority} />}
                                      </div>
                                      {concept.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                          {concept.description}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {concept.reason}
                                      </p>
                                      {concept.suggestedLayer && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs">
                                          Layer {concept.suggestedLayer}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {enrichment.metadata?.suggestedAdditions && enrichment.metadata.suggestedAdditions.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Suggested Additions ({enrichment.metadata.suggestedAdditions.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.metadata.suggestedAdditions.map((addition: any, aIdx: number) => (
                                <div key={aIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                          {addition.concept || addition.name}
                                        </span>
                                        {addition.priority && <PriorityBadge priority={addition.priority} />}
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {addition.reason}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Milestone Concept Discovery */}
                    {enrichmentType === 'MilestoneConceptDiscovery' && (
                      <div className="space-y-3">
                        {enrichment.missingConcepts && enrichment.missingConcepts.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Concepts ({enrichment.missingConcepts.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.missingConcepts.map((concept: any, cIdx: number) => (
                                <div key={cIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                          {concept.name}
                                        </span>
                                        {concept.priority && <PriorityBadge priority={concept.priority} />}
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {concept.reason}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {enrichment.missingRelationships && enrichment.missingRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Relationships ({enrichment.missingRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.missingRelationships.map((rel: any, rIdx: number) => (
                                <div key={rIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center gap-2">
                                    <ArrowRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.source}
                                    </span>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.target}
                                    </span>
                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded text-xs">
                                      {rel.type}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {rel.reason}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prerequisite Analysis */}
                    {enrichmentType === 'PrerequisiteAnalysis' && (
                      <div className="space-y-3">
                        {enrichment.directPrerequisites && enrichment.directPrerequisites.filter((p: any) => !p.existsInGraph).length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Direct Prerequisites
                            </h5>
                            <div className="space-y-2">
                              {enrichment.directPrerequisites
                                .filter((p: any) => !p.existsInGraph)
                                .map((prereq: any, pIdx: number) => (
                                  <div key={pIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                                      <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {prereq.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {prereq.reason}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Goal-Aware Relationships */}
                    {enrichmentType === 'GoalAwareRelationships' && (
                      <div className="space-y-3">
                        {enrichment.complementaryRelationships && enrichment.complementaryRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Complementary Relationships ({enrichment.complementaryRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.complementaryRelationships.map((rel: any, rIdx: number) => (
                                <div key={rIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.source}
                                    </span>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.target}
                                    </span>
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs">
                                      Strength: {Math.round(rel.strength * 100)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {rel.reason}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {enrichment.sequentialRelationships && enrichment.sequentialRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Sequential Relationships ({enrichment.sequentialRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.sequentialRelationships.map((rel: any, rIdx: number) => (
                                <div key={rIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.source}
                                    </span>
                                    <ArrowRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {rel.target}
                                    </span>
                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs">
                                      Strength: {Math.round(rel.strength * 100)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {rel.reason}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cross-Layer Discovery */}
                    {enrichmentType === 'CrossLayerDiscovery' && (
                      <div className="space-y-3">
                        {enrichment.bridgingConcepts && enrichment.bridgingConcepts.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Bridging Concepts ({enrichment.bridgingConcepts.length})
                            </h5>
                            <div className="space-y-2">
                              {enrichment.bridgingConcepts.map((concept: any, cIdx: number) => (
                                <div key={cIdx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {concept.name}
                                    </span>
                                    {concept.suggestedLayer && (
                                      <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs">
                                        Layer {concept.suggestedLayer}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {concept.reason}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })} 
        </div>

        {/* Prompts Section - Collapsible */}
        {enrichmentResult?.prompts && enrichmentResult.prompts.length > 0 && !isLoading && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Prompts Used ({enrichmentResult.prompts.length})
              </h4>
              {enrichmentResult.prompts.map((promptData, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setSelectedPrompt(promptData.prompt);
                      setShowPromptModal(true);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Code size={16} className="text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {promptData.strategy}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JSON Response Section - Collapsible */}
        {enrichmentResult && !isLoading && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={() => setShowJsonResponse(!showJsonResponse)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  View Raw JSON Response
                </span>
              </div>
              {showJsonResponse ? (
                <ChevronUp size={16} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
            {showJsonResponse && (
              <div className="mt-3 p-4 bg-gray-900 dark:bg-gray-950 rounded-lg border border-gray-700 dark:border-gray-800 overflow-auto max-h-96">
                <pre className="text-xs text-gray-300 dark:text-gray-400 whitespace-pre-wrap break-words">
                  {JSON.stringify(enrichmentResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {enrichmentResult ? (
              <>
                {totalSuggestions} suggestion{totalSuggestions !== 1 ? 's' : ''} found
              </>
            ) : (
              <>Waiting for results...</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
            {enrichmentResult && !enrichmentResult.applied && (
              <button
                onClick={handleApply}
                disabled={isApplying || totalSuggestions === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Apply Suggestions</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

