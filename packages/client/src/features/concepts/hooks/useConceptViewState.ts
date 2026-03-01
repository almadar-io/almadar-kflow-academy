import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Concept, ConceptGraph } from "../types";
import { ConceptViewMode } from "../components/ConceptViewHeader";
import { computeConceptLevels } from "./useConceptLevels";

export const getInitialViewMode = (conceptId?: string): ConceptViewMode =>
  conceptId ? "detail" : "list";

export const useConceptViewState = (
  conceptId?: string,
  detailConcept: Concept | null = null,
  selectedConcept: Concept | null = null,
  seedConcept: Concept | null = null,
  graphId?: string,
  relatedConcepts: Concept[] = [],
  graph?: ConceptGraph
) => {
  const [viewMode, setViewMode] = useState<ConceptViewMode>(
    getInitialViewMode(conceptId)
  );
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>(
    {}
  );
  const [isDetailExpanding, setIsDetailExpanding] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);

  // Seed expandedLevels with all levels set to false on load
  // If there are only two levels (0 and 1), keep both expanded
  useEffect(() => {
    if (relatedConcepts.length > 0) {
      // Calculate levels from top-level concepts (concepts with seedConcept as sole parent)
      const computedLevels = computeConceptLevels(relatedConcepts, graph);
      const newLevels = computedLevels.map(group => group.level).sort((a, b) => a - b);
      
      const hasOnlyTwoLevels =
        newLevels.length === 2 && newLevels[0] === 0 && newLevels[1] === 1;

      // Initialize expandedLevels
      setExpandedLevels((prev) => {
        const merged = { ...prev };

        // If there are only two levels (0 and 1), set both to true
        // Otherwise, set all levels to false if not already set
        newLevels.forEach((level, index) => {
          if (!(level in merged)) {
            if (hasOnlyTwoLevels) {
              merged[level] = true;
            } else if (index === newLevels.length - 1) {
              merged[level] = true;
            } else {
              merged[level] = false;
            }
          }
        });

        return merged;
      });
    }
  }, [relatedConcepts, graph]);

  // Reset state when graphId changes (switching between different graphs)
  useEffect(() => {
    if (graphId) {
      setViewMode(getInitialViewMode(conceptId));
      setIsDetailExpanding(false);
      setIsGeneratingLesson(false);
    }
  }, [graphId, conceptId]);

  const hasDetailCandidate = useMemo(
    () => Boolean(detailConcept || selectedConcept || seedConcept),
    [detailConcept, selectedConcept, seedConcept]
  );

  const handleToggleLevel = useCallback((level: number) => {
    setExpandedLevels((prev) => ({
      ...prev,
      [level]: prev[level] === undefined ? false : !prev[level],
    }));
  }, []);

  return {
    viewMode,
    setViewMode,
    expandedLevels,
    handleToggleLevel,
    isDetailExpanding,
    setIsDetailExpanding,
    isGeneratingLesson,
    setIsGeneratingLesson,
    hasDetailCandidate,
  };
};
