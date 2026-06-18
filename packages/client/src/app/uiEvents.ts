export const UI_EVENTS = {
  NAVIGATE: 'UI:NAVIGATE',
  NOTIFY: 'UI:NOTIFY',
  LOGOUT: 'UI:LOGOUT',
  LOGO_CLICK: 'UI:LOGO_CLICK',
  CREATE_LEARNING_PATH: 'UI:CREATE_LEARNING_PATH',
  BROWSE_STORIES: 'UI:BROWSE_STORIES',
  NAVIGATE_TO_MENTOR: 'UI:NAVIGATE_TO_MENTOR',
  CONCEPT_SELECT: 'UI:CONCEPT_SELECT',
  VIEW_MODE_CHANGE: 'UI:VIEW_MODE_CHANGE',
  JUMP_BACK_IN_CLICK: 'UI:JUMP_BACK_IN_CLICK',
  ACTIVITY_CLICK: 'UI:ACTIVITY_CLICK',
  LEARNING_PATH_CLICK: 'UI:LEARNING_PATH_CLICK',

  // LearnPage / learning-path management
  CREATE_NEW_PATH: 'UI:CREATE_NEW_PATH',
  DELETE_LEARNING_PATH: 'UI:DELETE_LEARNING_PATH',
  GOAL_FORM_COMPLETE: 'UI:GOAL_FORM_COMPLETE',

  // ConceptListPage / FocusModeTemplate
  CONCEPT_CLICK: 'UI:CONCEPT_CLICK',
  LOAD_NEXT_LEVEL: 'UI:LOAD_NEXT_LEVEL',
  GENERATE_LAYER_PRACTICE: 'UI:GENERATE_LAYER_PRACTICE',
  OPERATION_EXECUTE: 'UI:OPERATION_EXECUTE',

  // ConceptDetail — lesson lifecycle
  GENERATE_LESSON: 'UI:GENERATE_LESSON',
  EDIT_LESSON: 'UI:EDIT_LESSON',
  SAVE_LESSON: 'UI:SAVE_LESSON',
  CANCEL_EDIT: 'UI:CANCEL_EDIT',

  // ConceptDetail — prerequisites
  VIEW_PREREQUISITE: 'UI:VIEW_PREREQUISITE',
  ADD_PREREQUISITE: 'UI:ADD_PREREQUISITE',
  REMOVE_PREREQUISITE: 'UI:REMOVE_PREREQUISITE',

  // ConceptDetail — flash cards
  GENERATE_FLASH_CARDS: 'UI:GENERATE_FLASH_CARDS',

  // ConceptDetail — notes
  ADD_NOTE: 'UI:ADD_NOTE',
  UPDATE_NOTE: 'UI:UPDATE_NOTE',
  DELETE_NOTE: 'UI:DELETE_NOTE',

  // ConceptDetail — questions
  ASK_QUESTION: 'UI:ASK_QUESTION',
  SUBMIT_QUESTION: 'UI:SUBMIT_QUESTION',

  // ConceptDetail — annotation interactions
  SELECT_FOR_QUESTION: 'UI:SELECT_FOR_QUESTION',
  SELECT_FOR_NOTE: 'UI:SELECT_FOR_NOTE',
  ANNOTATION_CLICK: 'UI:ANNOTATION_CLICK',

  // ConceptDetail — concept navigation
  PREVIOUS_CONCEPT: 'UI:PREVIOUS_CONCEPT',
  NEXT_CONCEPT: 'UI:NEXT_CONCEPT',

  // ConceptDetail — learning science blocks
  SAVE_ACTIVATION: 'UI:SAVE_ACTIVATION',
  SAVE_REFLECTION: 'UI:SAVE_REFLECTION',
  ANSWER_BLOOM: 'UI:ANSWER_BLOOM',

  // ConceptDetail — interactive content
  RUN_CODE_SIMULATION: 'UI:RUN_CODE_SIMULATION',
  GENERATE_INTERACTIVE_ORBITAL: 'UI:GENERATE_INTERACTIVE_ORBITAL',
} as const;

export type UiEventKey = (typeof UI_EVENTS)[keyof typeof UI_EVENTS];

export interface UiNavigatePayload {
  url: string;
  replace?: boolean;
}

export interface UiNotifyPayload {
  severity: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface UiNavigateToMentorPayload {
  graphId: string;
}

export interface UiConceptSelectPayload {
  conceptId: string;
  graphId?: string;
}

export interface UiViewModeChangePayload {
  mode: 'list' | 'mindmap';
}

export interface UiJumpBackInClickPayload {
  itemId: string;
  type: string;
  graphId?: string;
}

export interface UiActivityClickPayload {
  type: string;
  conceptId?: string;
  graphId?: string;
  storyId?: string;
}

export interface UiLearningPathClickPayload {
  graphId: string;
  seedConceptId: string;
}

export interface UiCreateNewPathPayload {
  // no data — triggers goal form
}

export interface UiDeleteLearningPathPayload {
  graphId: string;
}

export interface UiGoalFormCompletePayload {
  goalId: string;
  graphId: string;
}

export interface UiConceptClickPayload {
  conceptId: string;
  graphId?: string;
}

export interface UiLoadNextLevelPayload {
  graphId: string;
}

export interface UiGenerateLayerPracticePayload {
  layerNumber: number;
  graphId: string;
}

export interface UiOperationExecutePayload {
  operationId: string;
  graphId?: string;
}

export interface UiGenerateLessonPayload {
  conceptId: string;
  graphId: string;
  simple: boolean;
}

export interface UiEditLessonPayload {
  conceptId: string;
}

export interface UiSaveLessonPayload {
  conceptId: string;
  lesson: string;
}

export interface UiCancelEditPayload {
  conceptId: string;
}

export interface UiViewPrerequisitePayload {
  prerequisiteName: string;
  graphId: string;
}

export interface UiAddPrerequisitePayload {
  prerequisiteName: string;
  graphId: string;
}

export interface UiRemovePrerequisitePayload {
  prerequisiteName: string;
  graphId: string;
}

export interface UiGenerateFlashCardsPayload {
  conceptId: string;
  graphId: string;
}

export interface UiAddNotePayload {
  text: string;
  selectedText?: string;
  selectedTextChunks?: string[];
}

export interface UiUpdateNotePayload {
  noteId: string;
  text: string;
}

export interface UiDeleteNotePayload {
  noteId: string;
}

export interface UiAskQuestionPayload {
  selectedText?: string;
}

export interface UiSubmitQuestionPayload {
  questionText: string;
  context?: string;
}

export interface UiSelectionInfo {
  text: string;
  textChunks: string[];
}

export interface UiSelectForQuestionPayload {
  selection: UiSelectionInfo;
}

export interface UiSelectForNotePayload {
  selection: UiSelectionInfo;
}

export interface UiAnnotationClickPayload {
  type: 'question' | 'note';
  annotationId: string;
}

export interface UiPreviousConceptPayload {
  conceptId: string;
  name: string;
}

export interface UiNextConceptPayload {
  conceptId: string;
  name: string;
}

export interface UiSaveActivationPayload {
  response: string;
}

export interface UiSaveReflectionPayload {
  index: number;
  note: string;
}

export interface UiAnswerBloomPayload {
  index: number;
  level: string;
}

export interface UiRunCodeSimulationPayload {
  code: string;
  language: string;
}

export interface UiGenerateInteractiveOrbitalPayload {
  conceptId?: string;
  conceptName: string;
  description?: string;
  type?: string;
}
