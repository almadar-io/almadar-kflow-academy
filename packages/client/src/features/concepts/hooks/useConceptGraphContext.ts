import { useMemo } from 'react';
import { Concept, ConceptGraph } from '../types';
import { getConceptsArray, findConceptById, findSeedConcept } from '../utils/graphHelpers';

interface UseConceptGraphContextParams {
  graphs: ConceptGraph[];
  graphId?: string;
  conceptId?: string;
  selectedConcept: Concept | null;
}

export const useConceptGraphContext = ({
  graphs,
  graphId,
  conceptId,
  selectedConcept,
}: UseConceptGraphContextParams) => {
  const currentGraph = useMemo(
    () => graphs.find(graph => graph.id === graphId),
    [graphs, graphId]
  );

  const conceptMap = currentGraph?.concepts;

  const conceptsArray = useMemo(
    () => (currentGraph ? getConceptsArray(currentGraph) : []),
    [currentGraph]
  );

  const seedConcept = useMemo(
    () =>
      currentGraph
        ? findSeedConcept(currentGraph) || null
        : null,
    [currentGraph]
  );

  const decodedConceptId = useMemo(
    () => (conceptId ? decodeURIComponent(conceptId) : undefined),
    [conceptId]
  );

  const detailConcept = useMemo(() => {
    if (!conceptId) return null;

    const key = decodedConceptId ?? conceptId;

    return (
      conceptMap?.get(key) ??
      conceptsArray.find(
        concept =>
          concept.id === conceptId ||
          concept.id === decodedConceptId ||
          concept.name === decodedConceptId
      ) ??
      null
    );
  }, [conceptId, decodedConceptId, conceptMap, conceptsArray]);

  const isDetailRoute = Boolean(decodedConceptId && detailConcept);

  const hasDetailCandidate = Boolean(detailConcept || selectedConcept || seedConcept);

  return {
    currentGraph,
    conceptMap,
    conceptsArray,
    seedConcept,
    detailConcept,
    decodedConceptId,
    isDetailRoute,
    hasDetailCandidate,
  };
};


