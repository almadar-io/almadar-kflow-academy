import React, { useMemo, useState, useRef } from 'react';
import { Concept, ConceptGraph } from '../types';
import MentorConceptCard from './MentorConceptCard';
import LayerOperationButtons from './LayerOperationButtons';
import { OperationType, OperationResult } from '../hooks/useMentorOperations';
import { ArrowRight, Circle, Sparkles, Loader2 } from 'lucide-react';
import { useConceptReorder } from '../hooks/useConceptReorder';
import LearningGoalDisplay from './LearningGoalDisplay';
import LayerEnrichmentButton from './LayerEnrichmentButton';

interface MentorConceptListProps {
  concepts: Concept[];
  groupedConceptsByLayer?: Record<number, Concept[]>; // Concepts grouped by layer number
  selectedConcept: Concept | null;
  onSelectConcept: (concept: Concept) => void;
  onOperation: (operation: OperationType, concept: Concept | Concept[], ...args: any[]) => Promise<OperationResult>;
  conceptMap?: Map<string, Concept>;
  graph?: ConceptGraph;
  graphId?: string;
  isLoading?: boolean;
  onConceptsAdded?: (concepts: Concept[]) => void;
  onOpenCustomPanel?: (concepts: Concept[], primaryConcept?: Concept) => void;
  onViewGoal?: () => void; // Callback to open goal modal
  onLoadMoreLayers?: () => void; // Callback to load more levels
}

interface MentorLevelSectionProps {
  level: number;
  concepts: Concept[];
  goal?: string;
  selectedConcept: Concept | null;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectConcept: (concept: Concept) => void;
  onOperation: (operation: OperationType, concept: Concept | Concept[], ...args: any[]) => Promise<OperationResult>;
  conceptMap?: Map<string, Concept>;
  graph?: ConceptGraph;
  graphId?: string;
  isLoading?: boolean;
  newlyAddedConceptIds?: Set<string>;
  levelRef?: React.RefObject<HTMLDivElement | null>;
  onConceptsAdded?: (concepts: Concept[]) => void;
  onOpenCustomPanel?: (concepts: Concept[], primaryConcept?: Concept) => void;
}

const MentorConceptList: React.FC<MentorConceptListProps> = ({
  concepts,
  groupedConceptsByLayer,
  selectedConcept,
  onSelectConcept,
  onOperation,
  conceptMap,
  graph,
  graphId,
  isLoading = false,
  onConceptsAdded,
  onOpenCustomPanel,
  onViewGoal,
  onLoadMoreLayers,
}) => {
  // Find seed concept
  const seedConcept = useMemo(() => {
    return concepts.find(c => c.isSeed) || concepts[0] || null;
  }, [concepts]);

  // Separate seedConcept and direct children
  const directChildren = useMemo(() => {
    if (!seedConcept) return [];

    // Find direct children: concepts that have seedConcept as their ONLY parent
    // OR concepts with no parents (fallback for concepts without explicit relationships)
    const children = concepts.filter(concept => {
      // Skip the seed concept itself
      if (concept.name === seedConcept.name || concept.id === seedConcept.id) {
        return false;
      }

      // If concept has parents, it must have exactly one parent and that parent must be the seedConcept
      if (concept.parents.length > 0) {
        return concept.parents.length === 1 && concept.parents[0] === seedConcept.name;
      }

      // If concept has no parents and is not the seed, include it as a direct child
      // This handles cases where relationships haven't been established yet
      // Only include if there are other concepts (not just the seed)
      if (concept.parents.length === 0 && concepts.length > 1) {
        return true;
      }

      return false;
    });

    // Sort direct children by sequence
    return [...children].sort((a, b) => {
      if (a.sequence === undefined && b.sequence === undefined) return 0;
      if (a.sequence === undefined) return 1;
      if (b.sequence === undefined) return -1;
      return a.sequence - b.sequence;
    });
  }, [concepts, seedConcept]);

  // Track newly added concepts
  const [newlyAddedConceptIds, setNewlyAddedConceptIds] = useState<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const levelRef = useRef<HTMLDivElement | null>(null);

  // Handle newly added concepts
  const handleConceptsAdded = React.useCallback((addedConcepts: Concept[]) => {
    if (addedConcepts.length === 0) return;

    // Create set of newly added concept IDs
    // Replace the previous set so only the latest batch stays green until next operation
    const newIds = new Set(addedConcepts.map(c => c.id || c.name));
    setNewlyAddedConceptIds(newIds);

    // Scroll to first new concept after a short delay to allow DOM update
    setTimeout(() => {
      if (levelRef?.current) {
        levelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Notify parent if callback provided
    if (onConceptsAdded) {
      onConceptsAdded(addedConcepts);
    }
  }, [onConceptsAdded]);

  // Helper to get children for a concept
  const getChildren = (concept: Concept): Concept[] => {
    if (!concept.children || concept.children.length === 0 || !conceptMap) {
      return [];
    }
    return concept.children
      .map(childName => conceptMap.get(childName))
      .filter((c): c is Concept => c !== undefined);
  };

  // Use reorder hook for direct children timeline (must be called before early return)
  const {
    sortedConcepts: sortedDirectChildren,
    draggedConcept,
    dragOverConcept,
    handleReorder,
    handleAddAsChild,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useConceptReorder({
    concepts: directChildren,
    conceptMap,
  });

  if (concepts.length === 0 || !seedConcept) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
          No concepts yet. Start by creating a seed concept.
        </p>
      </div>
    );
  }

  const isSeedNewlyAdded = newlyAddedConceptIds?.has(seedConcept.id || seedConcept.name) || false;

  // Check if there are no top-level concepts yet (only seed exists)
  // This means no direct children exist, AND there are no other concepts besides the seed
  const hasLayer1 = graph?.layers instanceof Map
    ? graph.layers.has(1)
    : graph?.layers ? (graph.layers as Record<number, any>)[1] !== undefined : false;
  const layer1Data = graph?.layers instanceof Map
    ? graph.layers.get(1)
    : graph?.layers ? (graph.layers as Record<number, any>)[1] : undefined;
  const hasConceptsInLayer1 = layer1Data?.conceptIds && layer1Data.conceptIds.length > 0;

  // Check if there are any concepts besides the seed concept
  const hasOtherConcepts = concepts.length > 1 || (conceptMap && conceptMap.size > 1);

  // Only show "Start Learning" if seed exists, no layer 1 concepts, AND no other concepts exist
  const hasNoTopLevelConcepts = seedConcept && !hasConceptsInLayer1 && !hasOtherConcepts && directChildren.length === 0;

  return (
    <div className="space-y-8">
      {/* Start Learning Section - Show when seed concept has no top-level concepts */}
      {hasNoTopLevelConcepts && seedConcept && onLoadMoreLayers && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl p-8 border border-indigo-200 dark:border-indigo-700 shadow-sm">
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles size={32} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Ready to Start Learning?
                </h3>
                <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
                  Let's generate your first learning level with concepts tailored to your goal. This will create a structured path to help you master {seedConcept.name}.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (onLoadMoreLayers) {
                      setIsLoadingMore(true);
                      try {
                        await onLoadMoreLayers();
                      } finally {
                        setIsLoadingMore(false);
                      }
                    }
                  }}
                  disabled={isLoading || isLoadingMore}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 active:bg-indigo-800 dark:active:bg-indigo-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {(isLoading || isLoadingMore) ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      <span>Generating First Level...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} />
                      <span>Start Learning</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seed Concept - Distinct Card at Top */}
      <div className="relative">
        <div className={`rounded-xl border-2 p-6 bg-gradient-to-br from-indigo-50 via-indigo-100 to-purple-50 dark:from-indigo-900/30 dark:via-indigo-800/30 dark:to-purple-900/30 ${isSeedNewlyAdded
            ? 'border-green-400 dark:border-green-500 ring-4 ring-green-200 dark:ring-green-800'
            : 'border-indigo-300 dark:border-indigo-700 shadow-lg'
          }`}>
          <div className="flex items-start gap-4">
            {/* Seed Concept Card Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded">
                  Seed Concept
                </span>
              </div>
              <MentorConceptCard
                concept={seedConcept}
                selectedConcept={selectedConcept}
                onSelectConcept={onSelectConcept}
                onOperation={onOperation}
                conceptMap={conceptMap}
                children={getChildren(seedConcept)}
                level={0}
                isLoading={isLoading}
                graph={graph}
                graphId={graphId}
                isNewlyAdded={isSeedNewlyAdded}
                onConceptsAdded={onConceptsAdded}
                onOpenCustomPanel={onOpenCustomPanel}
                onViewGoal={onViewGoal}
                siblingConcepts={[seedConcept]}
                onReorder={handleReorder}
                onAddAsChild={handleAddAsChild}
                isDragging={draggedConcept?.name === seedConcept.name}
                isDragOver={dragOverConcept?.name === seedConcept.name}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                draggedConcept={draggedConcept}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Display concepts grouped by layer OR direct children timeline */}
      {groupedConceptsByLayer ? (
        // Display all concepts grouped by layer (flat list under each layer)
        <div className="space-y-8">
          {Object.entries(groupedConceptsByLayer).map(([layerStr, layerConcepts]) => {
              const layerNumber = Number(layerStr);

              return (
                <div key={layerNumber} className="space-y-4">
                  {/* Layer Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Layer {layerNumber}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({layerConcepts.length} {layerConcepts.length === 1 ? 'concept' : 'concepts'})
                    </span>
                  </div>

                  {/* Layer-level operations */}
                  {graphId && (
                    <div className="mb-4">
                      <LayerOperationButtons
                        level={layerNumber - 1}
                        concepts={layerConcepts}
                        onOperation={onOperation}
                        isLoading={isLoading}
                        conceptMap={conceptMap}
                        onConceptsAdded={onConceptsAdded}
                        onOpenCustomPanel={onOpenCustomPanel}
                        graphId={graphId}
                        layerNumber={layerNumber}
                      />
                    </div>
                  )}

                  {/* Concepts in this layer - vertical list */}
                  <div className="space-y-4">
                    {layerConcepts.map((concept) => {
                      const isNewlyAdded = newlyAddedConceptIds?.has(concept.id || concept.name) || false;
                      return (
                        <MentorConceptCard
                          key={concept.id || concept.name}
                          concept={concept}
                          selectedConcept={selectedConcept}
                          onSelectConcept={onSelectConcept}
                          onOperation={onOperation}
                          conceptMap={conceptMap}
                          children={getChildren(concept)}
                          level={layerNumber}
                          isLoading={isLoading}
                          graph={graph}
                          graphId={graphId}
                          isNewlyAdded={isNewlyAdded}
                          onConceptsAdded={onConceptsAdded}
                          onOpenCustomPanel={onOpenCustomPanel}
                          onViewGoal={onViewGoal}
                          siblingConcepts={layerConcepts}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        // Fallback to direct children timeline (original behavior)
        directChildren.length > 0 && (
          <div className="space-y-6">
            {/* Layer-level operations for direct children */}
            <div className="mb-6">
              <LayerOperationButtons
                level={0}
                concepts={directChildren}
                onOperation={onOperation}
                isLoading={isLoading}
                conceptMap={conceptMap}
                onConceptsAdded={onConceptsAdded}
                onOpenCustomPanel={onOpenCustomPanel}
                graphId={graphId}
                layerNumber={1}
              />
            </div>

            {/* Timeline */}
            <div className="relative" ref={levelRef}>
              {/* Timeline line - vertical line connecting all concepts (hidden on mobile) */}
              {sortedDirectChildren.length > 1 && (
                <div className="hidden md:block absolute left-7 top-7 bottom-7 w-0.5 bg-gradient-to-b from-indigo-400 via-indigo-300 to-indigo-400 dark:from-indigo-500 dark:via-indigo-400 dark:to-indigo-500 opacity-60" />
              )}

              {/* Timeline items */}
              <div className="space-y-10">
                {sortedDirectChildren.map((concept, index) => {
                  const isLast = index === sortedDirectChildren.length - 1;
                  const stepNumber = index + 1;
                  const layerNumber = stepNumber; // Each direct child represents a layer (layer 1, 2, 3, etc.)
                  const isNewlyAdded = newlyAddedConceptIds?.has(concept.id || concept.name) || false;

                  // Get goal from the top-level concept itself (milestone is stored in the concept's goal key)
                  const layerGoal = concept.goal;

                  return (
                    <div key={concept.id || concept.name} className="relative flex items-start gap-6">
                      {/* Timeline node (hidden on mobile) */}
                      <div className="hidden md:block relative z-10 flex-shrink-0">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-white dark:border-gray-800 shadow-md transition-all ${isNewlyAdded
                            ? 'bg-green-500 dark:bg-green-600 ring-2 ring-green-300 dark:ring-green-700'
                            : 'bg-indigo-500 dark:bg-indigo-600'
                          }`}>
                          <span className="text-base font-semibold text-white">{stepNumber}</span>
                        </div>
                        {/* Connecting arrow (except for last item, hidden on mobile) */}
                        {!isLast && (
                          <div className="absolute left-1/2 top-14 -translate-x-1/2">
                            <ArrowRight
                              className="h-5 w-5 text-indigo-300 dark:text-indigo-500 rotate-90"
                              strokeWidth={2.5}
                            />
                          </div>
                        )}
                      </div>

                      {/* Concept card and learning goal */}
                      <div className="flex-1 pt-1 md:pt-1 space-y-4">
                        {/* Learning Goal Display and Enrichment Button */}
                        <div className="space-y-2">
                          <LearningGoalDisplay
                            goal={layerGoal}
                            layerNumber={layerNumber}
                            graphId={graphId}
                            onGoalUpdated={(newGoal) => {
                              // Optionally refresh the graph or update local state
                              console.log('Goal updated:', newGoal);
                            }}
                          />
                          {/* Layer Enrichment Button */}
                          {graphId && (
                            <LayerEnrichmentButton
                              graphId={graphId}
                              layerNumber={layerNumber}
                              onConceptsAdded={onConceptsAdded}
                            />
                          )}
                        </div>

                        {/* Concept card */}
                        <MentorConceptCard
                          concept={concept}
                          selectedConcept={selectedConcept}
                          onSelectConcept={onSelectConcept}
                          onOperation={onOperation}
                          conceptMap={conceptMap}
                          children={getChildren(concept)}
                          level={0}
                          isLoading={isLoading}
                          graph={graph}
                          graphId={graphId}
                          isNewlyAdded={isNewlyAdded}
                          onConceptsAdded={onConceptsAdded}
                          onOpenCustomPanel={onOpenCustomPanel}
                          siblingConcepts={sortedDirectChildren}
                          onReorder={handleReorder}
                          onAddAsChild={handleAddAsChild}
                          isDragging={draggedConcept?.name === concept.name}
                          isDragOver={dragOverConcept?.name === concept.name}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          draggedConcept={draggedConcept}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

      {/* Load More Button - Show at bottom if there are concepts */}
      {((groupedConceptsByLayer && Object.keys(groupedConceptsByLayer).length > 0) || directChildren.length > 0) && onLoadMoreLayers && (
        <div className="flex justify-center pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={async () => {
              setIsLoadingMore(true);
              try {
                await onLoadMoreLayers();
              } finally {
                setIsLoadingMore(false);
              }
            }}
            disabled={isLoading || isLoadingMore}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isLoading || isLoadingMore) ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load Next Level
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading Overlay - Show when loading more levels */}
      {(isLoadingMore || (isLoading && directChildren.length === 0)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <Loader2 size={48} className="mx-auto text-indigo-600 dark:text-indigo-400 animate-spin" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {directChildren.length === 0 ? 'Generating First Level...' : 'Loading Next Level...'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please wait while we create your learning concepts
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorConceptList;

