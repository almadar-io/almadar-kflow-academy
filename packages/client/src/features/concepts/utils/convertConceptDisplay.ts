import type { Concept, FlashCard, QuestionAnswer, NoteItem } from '../types';
import type { ConceptDisplay } from '../../knowledge-graph/api/types';
import type { JsonValue } from '@almadar-io/knowledge';

const strProp = (props: Record<string, JsonValue> | undefined, key: string): string | undefined => {
  const v = props?.[key];
  return typeof v === 'string' ? v : undefined;
};

const arrProp = <T>(props: Record<string, JsonValue> | undefined, key: string): T[] | undefined => {
  const v = props?.[key];
  return Array.isArray(v) ? (v as T[]) : undefined;
};

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
  lesson: strProp(display.properties, 'lesson'),
  goal: strProp(display.properties, 'goal'),
  difficulty: strProp(display.properties, 'difficulty') as Concept['difficulty'],
  focus: strProp(display.properties, 'focus'),
  flash: arrProp<FlashCard>(display.properties, 'flash'),
  questions: arrProp<QuestionAnswer>(display.properties, 'questions'),
  notes: arrProp<NoteItem>(display.properties, 'notes'),
  userProgress: display.properties?.userProgress && typeof display.properties.userProgress === 'object' && !Array.isArray(display.properties.userProgress)
    ? (display.properties.userProgress as Concept['userProgress'])
    : undefined,
});
