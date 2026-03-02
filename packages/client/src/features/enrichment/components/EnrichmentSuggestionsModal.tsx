/**
 * Enrichment Suggestions Modal
 * 
 * Displays enrichment suggestions in a nice visual format with the ability to apply them.
 */

import React, { useState, useMemo } from 'react';
import Modal from '../../../components/Modal';
import {
  Sparkles,
  CheckCircle2,
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
} from 'lucide-react';
import type { EnrichmentResult } from '../enrichmentApi';

// ── Enrichment sub-types ────────────────────────────────────────────────

interface EnrichmentConcept {
  name: string;
  description?: string;
  reason?: string;
  priority?: 'high' | 'medium' | 'low';
  suggestedLayer?: number;
}

interface EnrichmentRelationship {
  source: string;
  target: string;
  type: string;
  reason?: string;
  strength?: number;
}

interface EnrichmentPrerequisite {
  name: string;
  reason?: string;
  existsInGraph: boolean;
}

interface EnrichmentAddition {
  concept?: string;
  name?: string;
  reason?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface LayerCompletenessEnrichment {
  isComplete?: boolean;
  missingConcepts?: EnrichmentConcept[];
  missingRelationships?: EnrichmentRelationship[];
  metadata?: {
    completenessScore?: number;
    isComplete?: boolean;
    suggestedAdditions?: EnrichmentAddition[];
  };
}

interface MilestoneEnrichment {
  missingConcepts?: EnrichmentConcept[];
  missingRelationships?: EnrichmentRelationship[];
}

interface PrerequisiteEnrichment {
  directPrerequisites?: EnrichmentPrerequisite[];
  indirectPrerequisites?: EnrichmentPrerequisite[];
  suggestedPrerequisites?: EnrichmentPrerequisite[];
}

interface GoalAwareEnrichment {
  complementaryRelationships?: EnrichmentRelationship[];
  sequentialRelationships?: EnrichmentRelationship[];
  hierarchicalRelationships?: EnrichmentRelationship[];
}

interface CrossLayerEnrichment {
  bridgingConcepts?: EnrichmentConcept[];
  missingFoundations?: EnrichmentConcept[];
}

type EnrichmentItem =
  | LayerCompletenessEnrichment
  | MilestoneEnrichment
  | PrerequisiteEnrichment
  | GoalAwareEnrichment
  | CrossLayerEnrichment;

type IndexedEnrichment = EnrichmentItem & { _index: number };

// ── Props & types ───────────────────────────────────────────────────────

interface EnrichmentSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrichmentResult: EnrichmentResult | null;
  onApply: (enrichmentResult: EnrichmentResult) => Promise<void>;
  isApplying?: boolean;
  isLoading?: boolean;
}

type EnrichmentType =
  | 'LayerCompletenessAnalysis'
  | 'MilestoneConceptDiscovery'
  | 'PrerequisiteAnalysis'
  | 'GoalAwareRelationships'
  | 'CrossLayerDiscovery';

const getEnrichmentType = (enrichment: EnrichmentItem): EnrichmentType => {
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
  const [showJsonResponse, setShowJsonResponse] = useState(false);
  const [expandedPromptIdx, setExpandedPromptIdx] = useState<number | null>(null);

  // Group enrichments by type
  const groupedEnrichments = useMemo(() => {
    if (!enrichmentResult) return {} as Record<EnrichmentType, IndexedEnrichment[]>;

    const groups: Record<EnrichmentType, IndexedEnrichment[]> = {
      LayerCompletenessAnalysis: [],
      MilestoneConceptDiscovery: [],
      PrerequisiteAnalysis: [],
      GoalAwareRelationships: [],
      CrossLayerDiscovery: [],
    };

    enrichmentResult.enrichments.forEach((enrichment: EnrichmentItem, index: number) => {
      const type = getEnrichmentType(enrichment);
      groups[type].push({ ...enrichment, _index: index });
    });

    return groups;
  }, [enrichmentResult]);

  // Count total suggestions
  const totalSuggestions = useMemo(() => {
    if (!enrichmentResult) return 0;

    let count = 0;
    enrichmentResult.enrichments.forEach((raw: EnrichmentItem) => {
      const type = getEnrichmentType(raw);

      if (type === 'LayerCompletenessAnalysis') {
        const e = raw as LayerCompletenessEnrichment;
        count += e.missingConcepts?.length || 0;
        count += e.missingRelationships?.length || 0;
        count += e.metadata?.suggestedAdditions?.length || 0;
      } else if (type === 'MilestoneConceptDiscovery') {
        const e = raw as MilestoneEnrichment;
        count += e.missingConcepts?.length || 0;
        count += e.missingRelationships?.length || 0;
      } else if (type === 'PrerequisiteAnalysis') {
        const e = raw as PrerequisiteEnrichment;
        count += e.directPrerequisites?.filter(p => !p.existsInGraph).length || 0;
        count += e.indirectPrerequisites?.filter(p => !p.existsInGraph).length || 0;
        count += e.suggestedPrerequisites?.length || 0;
      } else if (type === 'GoalAwareRelationships') {
        const e = raw as GoalAwareEnrichment;
        count += e.complementaryRelationships?.length || 0;
        count += e.sequentialRelationships?.length || 0;
        count += e.hierarchicalRelationships?.length || 0;
      } else if (type === 'CrossLayerDiscovery') {
        const e = raw as CrossLayerEnrichment;
        count += e.bridgingConcepts?.length || 0;
        count += e.missingFoundations?.length || 0;
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
          {enrichmentResult && Object.entries(groupedEnrichments).map(([type, enrichments]) => {
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

                {enrichments.map((enrichment, idx) => {
                  const lce = enrichment as LayerCompletenessEnrichment;
                  const mce = enrichment as MilestoneEnrichment;
                  const pae = enrichment as PrerequisiteEnrichment;
                  const gae = enrichment as GoalAwareEnrichment;
                  const cle = enrichment as CrossLayerEnrichment;

                  return (
                  <div key={idx} className="mb-4 last:mb-0">
                    {/* Layer Completeness Analysis */}
                    {enrichmentType === 'LayerCompletenessAnalysis' && (
                      <div className="space-y-3">
                        {lce.metadata?.completenessScore !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Completeness: {Math.round((lce.metadata.completenessScore || 0) * 100)}%
                            </span>
                            {lce.metadata.isComplete && (
                              <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        )}

                        {lce.missingRelationships && lce.missingRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Relationships ({lce.missingRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {lce.missingRelationships.map((rel, rIdx) => (
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

                        {lce.missingConcepts && lce.missingConcepts.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Concepts ({lce.missingConcepts.length})
                            </h5>
                            <div className="space-y-2">
                              {lce.missingConcepts.map((concept, cIdx) => (
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

                        {lce.metadata?.suggestedAdditions && lce.metadata.suggestedAdditions.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Suggested Additions ({lce.metadata.suggestedAdditions.length})
                            </h5>
                            <div className="space-y-2">
                              {lce.metadata.suggestedAdditions.map((addition, aIdx) => (
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
                        {mce.missingConcepts && mce.missingConcepts.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Concepts ({mce.missingConcepts.length})
                            </h5>
                            <div className="space-y-2">
                              {mce.missingConcepts.map((concept, cIdx) => (
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

                        {mce.missingRelationships && mce.missingRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Missing Relationships ({mce.missingRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {mce.missingRelationships.map((rel, rIdx) => (
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
                        {pae.directPrerequisites && pae.directPrerequisites.filter(p => !p.existsInGraph).length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Direct Prerequisites
                            </h5>
                            <div className="space-y-2">
                              {pae.directPrerequisites
                                .filter(p => !p.existsInGraph)
                                .map((prereq, pIdx) => (
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
                        {gae.complementaryRelationships && gae.complementaryRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Complementary Relationships ({gae.complementaryRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {gae.complementaryRelationships.map((rel, rIdx) => (
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
                                      Strength: {Math.round((rel.strength || 0) * 100)}%
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

                        {gae.sequentialRelationships && gae.sequentialRelationships.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Sequential Relationships ({gae.sequentialRelationships.length})
                            </h5>
                            <div className="space-y-2">
                              {gae.sequentialRelationships.map((rel, rIdx) => (
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
                                      Strength: {Math.round((rel.strength || 0) * 100)}%
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
                        {cle.bridgingConcepts && cle.bridgingConcepts.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Bridging Concepts ({cle.bridgingConcepts.length})
                            </h5>
                            <div className="space-y-2">
                              {cle.bridgingConcepts.map((concept, cIdx) => (
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
                  );
                })}
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
                    onClick={() => setExpandedPromptIdx(expandedPromptIdx === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Code size={16} className="text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {promptData.strategy}
                      </span>
                    </div>
                    {expandedPromptIdx === idx ? (
                      <ChevronUp size={16} className="text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  {expandedPromptIdx === idx && (
                    <div className="p-4 bg-gray-900 dark:bg-gray-950 border-t border-gray-700 dark:border-gray-800 overflow-auto max-h-64">
                      <pre className="text-xs text-gray-300 dark:text-gray-400 whitespace-pre-wrap break-words">
                        {promptData.prompt}
                      </pre>
                    </div>
                  )}
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

