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
