import { useMemo } from 'react';
import { Concept } from '../types';
import { computeConceptLevels } from './useConceptLevels';

interface ConceptLevelNeighbors {
  previousConcept?: Concept;
  nextConcept?: Concept;
}

export const useConceptLevelNeighbors = (
  detailConcept: Concept | undefined,
  orderedConcepts: Concept[],
): ConceptLevelNeighbors =>
  useMemo(() => {
    if (!detailConcept) {
      return { previousConcept: undefined, nextConcept: undefined };
    }

    const groupedLevels = computeConceptLevels(orderedConcepts);
    
    // Find which level group contains the detail concept
    const sameLevelGroup = groupedLevels.find(group => 
      group.concepts.some(c => (c.id ?? c.name) === (detailConcept.id ?? detailConcept.name))
    );

    if (!sameLevelGroup) {
      return { previousConcept: undefined, nextConcept: undefined };
    }

    const sameLevelConcepts = sameLevelGroup.concepts;

    const detailIdentifier = detailConcept.id ?? detailConcept.name;
    const currentIndex = sameLevelConcepts.findIndex(concept => {
      const identifier = concept.id ?? concept.name;
      return identifier === detailIdentifier;
    });

    const previous = currentIndex > 0 ? sameLevelConcepts[currentIndex - 1] : undefined;
    const next =
      currentIndex >= 0 && currentIndex < sameLevelConcepts.length - 1
        ? sameLevelConcepts[currentIndex + 1]
        : undefined;

    return { previousConcept: previous, nextConcept: next };
  }, [orderedConcepts, detailConcept]);
