import { useMemo } from 'react';
import { Concept } from '../types';
import {
  buildRelatedConcepts,
  convertConceptToNote,
} from '../utils/graphHelpers';
import { Note } from '../../notes/types';

interface UseConceptGraphRelationsParams {
  seedConcept: Concept | null;
  conceptsArray: Concept[];
  conceptMap?: Map<string, Concept>;
  selectedConcept: Concept | null;
}

export const useConceptGraphRelations = ({
  seedConcept,
  conceptsArray,
  conceptMap,
  selectedConcept,
}: UseConceptGraphRelationsParams) => {
  const relatedConcepts = useMemo(
    () => buildRelatedConcepts(seedConcept, conceptsArray),
    [seedConcept, conceptsArray]
  );

  const lessonPreviews = useMemo(
    () =>
      relatedConcepts
        .filter(concept => Boolean(concept.lesson))
        .map(concept => ({
          id: concept.id ?? concept.name,
          title: concept.name,
          content: concept.lesson ?? '',
        })),
    [relatedConcepts]
  );

  const notesForMindMap = useMemo(
    () => relatedConcepts.map(concept => convertConceptToNote(concept, conceptMap)),
    [relatedConcepts, conceptMap]
  );

  const selectedNoteForMindMap: Note | null = useMemo(() => {
    if (!selectedConcept) return null;
    return convertConceptToNote(selectedConcept, conceptMap);
  }, [selectedConcept, conceptMap]);

  return {
    relatedConcepts,
    lessonPreviews,
    notesForMindMap,
    selectedNoteForMindMap,
  };
};


