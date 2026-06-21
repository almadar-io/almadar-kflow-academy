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
 * serialization. Interfaces have no implicit index signature — use propsToRecord
 * from @almadar-io/knowledge instead where possible; this thin shim is kept only for
 * local migration scripts that cannot import from the package.
 */
export { propsToRecord } from '@almadar-io/knowledge';
