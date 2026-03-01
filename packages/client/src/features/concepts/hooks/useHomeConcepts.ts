import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ConceptGraph, Concept } from '../types';
import { useAppDispatch } from '../../../app/hooks';
import { selectConcept } from '../conceptSlice';
import { computeConceptLevels } from './useConceptLevels';

interface SeedEntry {
  graph: ConceptGraph;
  seedConcept: Concept;
  conceptCount: number;
  levelCount: number;
}

export const useHomeConcepts = (graphs: ConceptGraph[]) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const seedEntries = useMemo<SeedEntry[]>(() =>
    graphs
      .map(graph => {
        // Get seed concept directly from graph using seedConceptId
        const seedConcept = Array.from(graph.concepts.values()).find(
          c => c.id === graph.seedConceptId || c.isSeed
        );
        if (!seedConcept) return null;

        // Convert graph concepts Map to array for computeConceptLevels
        const conceptsArray = Array.from(graph.concepts.values());
        
        // Use computeConceptLevels to get the correct level count
        const levels = computeConceptLevels(conceptsArray, graph);
        const levelCount = levels.length;

        return {
          graph,
          seedConcept,
          conceptCount: graph.concepts.size,
          levelCount: levelCount || 0, // Return 0 if no levels, but typically should be at least 0
        };
      })
      .filter((entry): entry is SeedEntry => entry !== null)
      .sort((a, b) => {
        // Sort by lastAccessedAt if available, otherwise by createdAt
        // TODO: Add lastAccessedAt tracking to ConceptGraph when concept is viewed
        const aTime = (a.graph as any).lastAccessedAt ?? a.graph.createdAt ?? 0;
        const bTime = (b.graph as any).lastAccessedAt ?? b.graph.createdAt ?? 0;
        return bTime - aTime;
      }),
  [graphs]);

  const handleConceptClick = (graphId: string, concept: Concept) => {
    dispatch(selectConcept(concept));
    navigate(`/concepts/${graphId}`);
  };

  return {
    seedEntries,
    handleConceptClick,
  };
};


