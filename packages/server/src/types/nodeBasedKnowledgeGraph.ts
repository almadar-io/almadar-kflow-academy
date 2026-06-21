export type {
  NodeType,
  RelationshipType,
  RelationshipDirection,
  RelationshipMetadata,
  Relationship,
  GraphNode,
  GraphNodeProperties,
  ConceptNodeProperties,
  LayerNodeProperties,
  LearningGoalNodeProperties,
  MilestoneNodeProperties,
  PracticeExerciseNodeProperties,
  QuestionAnswerItem,
  LessonNodeProperties,
  ConceptMetadataNodeProperties,
  GraphMetadataNodeProperties,
  FlashCardNodeProperties,
  StoryNodeProperties,
  StoryStep,
  CourseNodeProperties,
  CourseModule,
  ConceptRef,
  AssessmentNodeProperties,
  TranslationNodeProperties,
  LanguageConfigNodeProperties,
  StudentNodeProperties,
  ScheduleSlotNodeProperties,
  ProgressNodeProperties,
  EnrollmentNodeProperties,
  AssessmentSubmissionNodeProperties,
  NodeTypeIndex,
  NodeBasedKnowledgeGraph,
} from '@kflow-academy/shared';

export {
  isNodeType,
  getNodeProperties,
  createGraphNode,
  createRelationship,
  generateRelationshipId,
  generateNodeId,
  createCourseNode,
  createAssessmentNode,
  createTranslationNode,
  createLanguageConfigNode,
  createStudentNode,
  createScheduleSlotNode,
  createEmptyNodeTypeIndex,
} from '@kflow-academy/shared';

/**
 * Narrow a typed node-property object to a generic record for dynamic key access /
 * serialization. Interfaces have no implicit index signature, so direct assignment to
 * Record<string, unknown> fails — build the record via Object.entries (no cast).
 */
export function propsToRecord(props: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const entries: Array<[string, unknown]> = Object.entries(props);
  for (const [k, v] of entries) out[k] = v;
  return out;
}
