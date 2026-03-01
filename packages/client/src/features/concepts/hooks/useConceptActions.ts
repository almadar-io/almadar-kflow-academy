import { useCallback } from 'react';
import { AppDispatch } from '../../../app/store';
import { Concept } from '../types';
import {
  selectConcept,
  addConcepts,
  setLoading,
  setError,
  updateConcept,
} from '../conceptSlice';
import { ConceptsAPI } from '../ConceptsAPI';
import { buildGraphRecord } from '../utils/graphHelpers';
import { getConceptRouteId } from '../utils/graphHelpers';
import { ConceptGraph } from '../types';
import { computeConceptLevels } from './useConceptLevels';

interface UseConceptActionsParams {
  dispatch: AppDispatch;
  navigate: (path: string) => void;
  seedConcept: Concept | null;
  conceptsArray: Concept[];
  relatedConcepts: Concept[];
  conceptMap?: Map<string, Concept>;
  graphId: string;
  currentGraph?: ConceptGraph;
}

export const useConceptActions = ({
  dispatch,
  navigate,
  seedConcept,
  conceptsArray,
  relatedConcepts,
  conceptMap,
  graphId,
  currentGraph,
}: UseConceptActionsParams) => {
  const ensureGraphId = useCallback(() => {
    if (!graphId) {
      throw new Error('Graph id missing in route');
    }
    return graphId;
  }, [graphId]);

  const handleSelectConcept = useCallback(
    (concept: Concept) => {
      dispatch(selectConcept(concept));
      const currentGraphIdValue = ensureGraphId();
      navigate(`/concepts/${currentGraphIdValue}/concept/${getConceptRouteId(concept)}`);
    },
    [dispatch, ensureGraphId, navigate]
  );

  const handleNavigateToParent = useCallback(
    (parentName: string) => {
      if (!conceptMap) return;
      const parentConcept = conceptMap.get(parentName) || relatedConcepts.find(c => c.name === parentName);
      if (parentConcept) {
        handleSelectConcept(parentConcept);
      }
    },
    [conceptMap, relatedConcepts, handleSelectConcept]
  );

  const handleNavigateToChild = useCallback(
    (childName: string) => {
      if (!conceptMap) return;
      const childConcept = conceptMap.get(childName) || relatedConcepts.find(c => c.name === childName);
      if (childConcept) {
        handleSelectConcept(childConcept);
      }
    },
    [conceptMap, relatedConcepts, handleSelectConcept]
  );

  const handleLoadMoreLevels = useCallback(async (onStreamChunk?: (chunk: string) => void) => {
    if (!seedConcept) return;

    dispatch(setLoading(true));
    //set the selected concept to seedConcept
    dispatch(selectConcept(null));
    try {
      // Get ALL previous layers using the new level concept structure
      // In the new structure: level concepts are top-level (seedConcept as sole parent)
      // previousLayers = all existing top-level concepts (level concepts) + all concepts within those levels
      const levelConcepts = relatedConcepts.filter(c => 
        c.parents.length === 1 && 
        c.parents[0] === seedConcept.name &&
        c.name !== seedConcept.name
      );
      
      // Get all concepts from previous levels (level concepts + all their child concepts)
      const previousLayers: Concept[] = [];
      levelConcepts.forEach(levelConcept => {
        // Add the level concept itself
        previousLayers.push(levelConcept);
        // Add all concepts that belong to this level (have this level concept as a parent)
        const levelConceptsList = relatedConcepts.filter(c => 
          c.parents.includes(levelConcept.name) && 
          c.name !== levelConcept.name &&
          c.name !== seedConcept.name
        );
        previousLayers.push(...levelConceptsList);
      });
      
      // Use goalFocused from graph (default to false if not set)
      const goalFocused = currentGraph?.goalFocused ?? false;
      const response = await ConceptsAPI.progressiveExpandMultipleFromText({
        concept: seedConcept,
        previousLayers,
        numConcepts: 10,
        graphId: ensureGraphId(),
        goalFocused,
        stream: true, // Enable streaming for real-time updates
      }, onStreamChunk);

      // Dispatch concepts and layer data from response (either non-streaming or final streaming result)
      if (response.concepts && response.concepts.length > 0) {
        dispatch(addConcepts({ 
          concepts: response.concepts,
          model: response.model,
        }));
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Failed to load next level from text'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, relatedConcepts, seedConcept, ensureGraphId, currentGraph]);

  const handleSummarizeLevel = useCallback(
    async (level: number) => {
      dispatch(setLoading(true));
      try {
        // Find concepts in the specified level using computed levels
        const computedLevels = computeConceptLevels(relatedConcepts, currentGraph);
        const levelGroup = computedLevels.find(group => group.level === level);
        
        if (!levelGroup || levelGroup.concepts.length === 0) return;

        const response = await ConceptsAPI.deriveSummary({
          concepts: levelGroup.concepts,
          seedConcept: seedConcept || undefined,
        });

        dispatch(addConcepts({ concepts: response.concepts, model: response.model }));
      } catch (error) {
        dispatch(setError(error instanceof Error ? error.message : 'Failed to summarize level'));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, relatedConcepts, seedConcept, currentGraph]
  );

  const handleExplainConceptForConcept = useCallback(
    async (conceptToExplain: Concept, simple?: boolean, onStreamChunk?: (chunk: string) => void) => {
      dispatch(setLoading(true));
      let accumulatedContent = '';
      let wasStreaming = false;
      let lastUpdatedConcept: Concept = conceptToExplain; // Track the last concept we updated
      
      try {
        const response = await ConceptsAPI.explainConcept(
          {
            concept: conceptToExplain,
            seedConcept: seedConcept || undefined,
            simple,
            graphId: ensureGraphId(),
            stream: true, // Enable streaming for real-time updates
          },
          (chunk: string) => {
            wasStreaming = true;
            accumulatedContent += chunk;
            if (onStreamChunk) {
              onStreamChunk(chunk);
            }
            // Update the concept in real-time as chunks arrive
            // Use the last updated concept as base to avoid stale reads from conceptMap
            const updatedConcept: Concept = {
              ...lastUpdatedConcept,
              lesson: accumulatedContent,
            };
            lastUpdatedConcept = updatedConcept; // Track for next update
            dispatch(updateConcept(updatedConcept));
          }
        );
        
        // If we were streaming, the concept is already updated with the lesson content
        // Just update prerequisites if needed, without touching the lesson
        if (wasStreaming) {
          // Final update with prerequisites from the response
          // Use lastUpdatedConcept to ensure we have the latest lesson content
          const finalConcept = response.concepts[0];
          // Always do final update to ensure prerequisites are set and lesson is preserved
          const updatedConcept: Concept = {
            ...lastUpdatedConcept,
            // Always use accumulatedContent if available (it should be), otherwise keep existing lesson
            lesson: accumulatedContent.trim() || lastUpdatedConcept.lesson || '',
            prerequisites: finalConcept?.prerequisites,
          };
          dispatch(updateConcept(updatedConcept));
        } else {
          // Non-streaming: use addConcepts as before
          dispatch(addConcepts({ concepts: response.concepts }));
        }
        
        // Note: We don't need to call selectConcept here because:
        // 1. During streaming, updateConcept already updates selectedConcept if it matches
        // 2. For non-streaming, addConcepts already updates selectedConcept if it matches
        // Calling selectConcept again would cause unnecessary re-renders
      } catch (error) {
        dispatch(setError(error instanceof Error ? error.message : 'Failed to generate lesson'));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, seedConcept, conceptMap, ensureGraphId]
  );

  const handleExpandConcept = useCallback(
    async (concept: Concept) => {
      const graphRecord = buildGraphRecord(conceptsArray);

      const response = await ConceptsAPI.expandConcept({
        concept,
        graph: { concepts: graphRecord },
      });

      dispatch(addConcepts({ concepts: response.concepts, model: response.model }));
    },
    [conceptsArray, dispatch]
  );

  const handleGenerateNextConceptForConcept = useCallback(
    async (concept: Concept) => {
      const graphRecord = buildGraphRecord(conceptsArray);

      const response = await ConceptsAPI.generateNextConcept({
        concept,
        numSteps: 5,
        graph: { concepts: graphRecord },
      });

      dispatch(addConcepts({ concepts: response.concepts, model: response.model }));
    },
    [conceptsArray, dispatch]
  );

  const handleUpdateConcept = useCallback(
    (concept: Concept) => {
      dispatch(updateConcept(concept));
    },
    [dispatch]
  );

  const handleAddPrerequisite = useCallback(
    (concept: Concept, prerequisiteName: string) => {
      // Skip if prerequisite name is "none"
      if (!prerequisiteName || prerequisiteName.trim().toLowerCase() === 'none') {
        return;
      }
      
      // Link prerequisite to seed concept so it appears in relatedConcepts
      // Prerequisites are foundational concepts, so they should be children of the seed concept
      const prerequisiteParents: string[] = [];
      const prerequisiteChildren: string[] = [];
      
      if (seedConcept) {
        // Link prerequisite to seed concept as parent
        prerequisiteParents.push(seedConcept.name);
        
        // Also add to seed concept's children list
        if (!seedConcept.children.includes(prerequisiteName)) {
          const updatedSeed: Concept = {
            ...seedConcept,
            children: [...(seedConcept.children || []), prerequisiteName],
          };
          dispatch(updateConcept(updatedSeed));
        }
      }
      
      // Calculate sequence - use a low sequence number to put prerequisites early
      const existingSequences = conceptsArray
        .map(c => c.sequence)
        .filter((seq): seq is number => seq !== undefined);
      const prerequisiteSequence = existingSequences.length > 0
        ? Math.min(...existingSequences) - 1000 // Put before existing concepts
        : 0; // Base sequence
      
      const newPrerequisite: Concept = {
        id: `prereq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: prerequisiteName,
        description: `Prerequisite for ${concept.name}`,
        parents: prerequisiteParents,
        children: prerequisiteChildren,
        sequence: prerequisiteSequence,
        isAutoGenerated: true,
        isPrerequisite: true,
      };

      dispatch(addConcepts({ concepts: [newPrerequisite] }));

      // Update the concept to include the new prerequisite if it's not already there
      const updatedPrerequisites = concept.prerequisites || [];
      if (!updatedPrerequisites.includes(prerequisiteName)) {
        const updatedConcept: Concept = {
          ...concept,
          prerequisites: [...updatedPrerequisites, prerequisiteName],
        };
        dispatch(updateConcept(updatedConcept));
      }
    },
    [dispatch, conceptsArray, seedConcept]
  );

  const handleAddAllMissingPrerequisites = useCallback(
    (concept: Concept, missingPrerequisites: string[]) => {
      missingPrerequisites.forEach(prereqName => {
        handleAddPrerequisite(concept, prereqName);
      });
    },
    [handleAddPrerequisite]
  );

  const handleRemovePrerequisite = useCallback(
    (concept: Concept, prerequisiteName: string) => {
      if (!concept.prerequisites || concept.prerequisites.length === 0) {
        return;
      }

      // Remove the prerequisite from the concept's prerequisites list
      const updatedPrerequisites = concept.prerequisites.filter(
        prereq => prereq !== prerequisiteName
      );

      const updatedConcept: Concept = {
        ...concept,
        prerequisites: updatedPrerequisites.length > 0 ? updatedPrerequisites : undefined,
      };

      dispatch(updateConcept(updatedConcept));
    },
    [dispatch]
  );

  return {
    handleSelectConcept,
    handleNavigateToParent,
    handleNavigateToChild,
    handleLoadMoreLevels,
    handleSummarizeLevel,
    handleExplainConceptForConcept,
    handleExpandConcept,
    handleGenerateNextConceptForConcept,
    handleUpdateConcept,
    handleAddPrerequisite,
    handleAddAllMissingPrerequisites,
    handleRemovePrerequisite,
    ensureGraphId,
  };
};


