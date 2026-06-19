import type { Concept } from '../types';
import type { ConceptDisplay } from '../../knowledge-graph/api/types';

export const convertConceptDisplayToConcept = (display: ConceptDisplay): Concept => ({
  id: display.id,
  name: display.name,
  description: display.description,
  layer: display.layer,
  isSeed: display.isSeed,
  sequence: display.sequence,
  parents: display.parents,
  children: display.children,
  prerequisites: display.prerequisites,
  lesson: display.properties?.lesson,
  goal: display.properties?.goal,
  difficulty: display.properties?.difficulty,
  focus: display.properties?.focus,
  flash: display.properties?.flash,
  questions: display.properties?.questions,
  notes: display.properties?.notes,
  userProgress: display.properties?.userProgress,
});
