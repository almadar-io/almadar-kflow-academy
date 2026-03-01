import { useMemo } from 'react';
import { Concept } from '../types';

interface RelatedConceptInfo {
  name: string;
  description?: string;
}

interface UseConceptDetailRelationsParams {
  concept: Concept;
  conceptMap?: Map<string, Concept>;
}

export const useConceptDetailRelations = ({ concept, conceptMap }: UseConceptDetailRelationsParams) => {
  const parentNames = concept.parents ?? [];

  const relatedChildren: RelatedConceptInfo[] = useMemo(
    () =>
      (concept.children ?? []).map(childName => {
        const childConcept = conceptMap?.get(childName);
        return {
          name: childName,
          description: childConcept?.description,
        };
      }),
    [concept.children, conceptMap]
  );

  return {
    parentNames,
    relatedChildren,
  };
};


