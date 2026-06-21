import type {
  GraphNode,
  NodeType,
  TypedNodeProperties,
  AssessmentNodeProperties,
  TranslationNodeProperties,
  LanguageConfigNodeProperties,
  StudentNodeProperties,
  ScheduleSlotNodeProperties,
} from '@almadar-io/knowledge';
import {
  createGraphNode as _pkgCreateGraphNode,
  generateNodeId,
} from '@almadar-io/knowledge';

// Bridge: concrete property objects satisfy TypedNodeProperties at runtime but TS
// can't verify the exact discriminated union branch here — single cast kept here.
function makeGraphNode(id: string, type: NodeType, properties: object): GraphNode {
  return _pkgCreateGraphNode(id, type, properties as TypedNodeProperties);
}

// Re-export all types and pure functions from the published package
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
  NodeIdContext,
  SchemaVersion,
  TypedNodeProperties,
  TraverseOptions,
  TraverseResult,
  Violation,
} from '@almadar-io/knowledge';

export {
  SCHEMA_VERSION,
  isNodeType,
  createGraphNode,
  createRelationship,
  generateRelationshipId,
  generateNodeId,
  createCourseNode,
  createEmptyNodeTypeIndex,
  validateGraph,
  toGraphologyGraph,
  fromGraphologyGraph,
  createGraphologyGraph,
  extractSubgraph,
  findPath,
  traverse,
} from '@almadar-io/knowledge';

// kflow-specific helpers not present in the package

export function getNodeProperties<T extends NodeType>(
  node: GraphNode,
  type: T
): unknown {
  if (node.type !== type) {
    throw new Error(`Node ${node.id} is not of type ${type}`);
  }
  return node.properties;
}

export function createAssessmentNode(
  conceptId: string,
  assessment: Partial<AssessmentNodeProperties>,
  index: number = 0
): GraphNode {
  const id = generateNodeId('Assessment', { conceptId, index });
  const properties: AssessmentNodeProperties = {
    id,
    title: assessment.title || 'Assessment',
    conceptRefs: assessment.conceptRefs ?? [],
    questionIds: assessment.questionIds,
    passThreshold: assessment.passThreshold,
    grantsCredential: assessment.grantsCredential,
  };
  return makeGraphNode(id, 'Assessment', properties);
}

export function createTranslationNode(
  sourceNodeId: string,
  sourceNodeType: NodeType,
  language: string,
  translatedContent: Record<string, string | number | boolean | null>,
  options: Partial<TranslationNodeProperties> = {}
): GraphNode {
  const id = generateNodeId('Translation', { sourceNodeId, language });
  const now = Date.now();
  const properties: TranslationNodeProperties = {
    id,
    sourceNodeId,
    sourceNodeType,
    language,
    translatedContent,
    translatedAt: options.translatedAt || now,
    translatedBy: options.translatedBy || 'ai',
    aiModel: options.aiModel,
    reviewedBy: options.reviewedBy,
    reviewedAt: options.reviewedAt,
    status: options.status || 'draft',
    quality: options.quality,
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
  };
  return makeGraphNode(id, 'Translation', properties);
}

export function createLanguageConfigNode(
  graphId: string,
  config: Partial<LanguageConfigNodeProperties> & { language: string }
): GraphNode {
  const id = generateNodeId('LanguageConfig', { graphId, language: config.language });
  const now = Date.now();
  const languageDisplayNames: Record<string, { display: string; native: string; direction: 'ltr' | 'rtl' }> = {
    en: { display: 'English', native: 'English', direction: 'ltr' },
    es: { display: 'Spanish', native: 'Español', direction: 'ltr' },
    ar: { display: 'Arabic', native: 'العربية', direction: 'rtl' },
    zh: { display: 'Chinese', native: '中文', direction: 'ltr' },
    fr: { display: 'French', native: 'Français', direction: 'ltr' },
    de: { display: 'German', native: 'Deutsch', direction: 'ltr' },
    pt: { display: 'Portuguese', native: 'Português', direction: 'ltr' },
    ja: { display: 'Japanese', native: '日本語', direction: 'ltr' },
    ko: { display: 'Korean', native: '한국어', direction: 'ltr' },
    hi: { display: 'Hindi', native: 'हिन्दी', direction: 'ltr' },
    ru: { display: 'Russian', native: 'Русский', direction: 'ltr' },
  };
  const defaults = languageDisplayNames[config.language] || {
    display: config.language,
    native: config.language,
    direction: 'ltr' as const,
  };
  const properties: LanguageConfigNodeProperties = {
    id,
    language: config.language,
    displayName: config.displayName || defaults.display,
    nativeDisplayName: config.nativeDisplayName || defaults.native,
    direction: config.direction || defaults.direction,
    isEnabled: config.isEnabled ?? true,
    autoTranslate: config.autoTranslate ?? false,
    aiTranslationModel: config.aiTranslationModel,
    customTerminology: config.customTerminology,
    createdAt: config.createdAt || now,
    updatedAt: config.updatedAt || now,
  };
  return makeGraphNode(id, 'LanguageConfig', properties);
}

export function createStudentNode(
  userId: string,
  studentData: Partial<StudentNodeProperties>
): GraphNode {
  const id = generateNodeId('Student', { userId });
  const now = Date.now();
  const properties: StudentNodeProperties = {
    id,
    userId,
    name: studentData.name || '',
    email: studentData.email || '',
    phone: studentData.phone,
    createdAt: studentData.createdAt || now,
    updatedAt: studentData.updatedAt || now,
  };
  return makeGraphNode(id, 'Student', properties);
}

export function createScheduleSlotNode(
  studentUserId: string,
  scheduleData: Partial<ScheduleSlotNodeProperties>
): GraphNode {
  const id = generateNodeId('ScheduleSlot', {
    studentUserId,
    dayOfWeek: scheduleData.dayOfWeek,
    startTime: scheduleData.startTime,
  });
  const now = Date.now();
  let duration = scheduleData.duration;
  if (!duration && scheduleData.startTime && scheduleData.endTime) {
    const start = new Date(`2000-01-01T${scheduleData.startTime}`);
    const end = new Date(`2000-01-01T${scheduleData.endTime}`);
    duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }
  const properties: ScheduleSlotNodeProperties = {
    id,
    studentUserId,
    courseId: scheduleData.courseId,
    dayOfWeek: scheduleData.dayOfWeek ?? 0,
    startTime: scheduleData.startTime || '',
    endTime: scheduleData.endTime || '',
    duration,
    location: scheduleData.location,
    room: scheduleData.room,
    recurring: scheduleData.recurring ?? true,
    createdAt: scheduleData.createdAt || now,
    updatedAt: scheduleData.updatedAt || now,
  };
  return makeGraphNode(id, 'ScheduleSlot', properties);
}
