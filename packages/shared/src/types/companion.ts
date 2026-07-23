export type SuggestionType = 'expand' | 'study' | 'review' | 'connect' | 'discover';

export type SuggestionAction = 'open-graph' | 'open-concept' | 'create-goal';

export interface SuggestionParams {
  conceptName?: string;
  clusterName?: string;
  clusterSize?: number;
  convergenceConcepts?: string[];
  parentConcept?: string;
  pathTitle?: string;
}

export interface Suggestion {
  type: SuggestionType;
  action: SuggestionAction;
  target: string;
  nodeId?: string;
  params: SuggestionParams;
}

export interface TrajectorySummary {
  totalPaths: number;
  totalConcepts: number;
  clusters: Array<{ id: string; name: string; size: number }>;
  frontierConcepts: string[];
  lastActiveGraph: string | null;
  topConvergences: Array<{ source: string; target: string; weight: number; sharedConcepts: string[] }>;
  gaps: Array<{ conceptId: string; name: string; graphId: string; parentConcept: string; pathTitle: string }>;
}

export interface CompanionAnalyzeResponse {
  suggestion: Suggestion;
  trajectory: TrajectorySummary;
}

export interface CompanionReplyResponse {
  reply: string;
}
