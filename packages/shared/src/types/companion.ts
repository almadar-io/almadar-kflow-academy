export type SuggestionType = 'expand' | 'study' | 'review' | 'connect' | 'discover';

export type SuggestionAction = 'open-graph' | 'open-concept' | 'create-goal';

export interface SuggestionParams {
  conceptName?: string;
  clusterName?: string;
  clusterSize?: number;
  convergenceConcepts?: string[];
  parentConcept?: string;
  pathTitle?: string;
  goalTitle?: string;
  missingCount?: number;
  missingConcepts?: string[];
  totalConcepts?: number;
  studiedCount?: number;
}

export interface Suggestion {
  type: SuggestionType;
  action: SuggestionAction;
  target: string;
  nodeId?: string;
  params: SuggestionParams;
}

export interface PathTrajectoryDTO {
  graphId: string;
  title: string;
  goalTitle: string;
  goalDescription: string;
  conceptCount: number;
  layerCount: number;
  maxLayer: number;
  frontierConcepts: string[];
  prereqGaps: Array<{ concept: string; neededBy: string }>;
  updatedAt: number;
}

export interface ClusterSummaryDTO {
  id: string;
  name: string;
  size: number;
  memberPaths: Array<{ id: string; title: string; goalTitle: string }>;
  allConcepts: string[];
  frontierConcepts: string[];
}

export interface TrajectorySummary {
  totalPaths: number;
  totalConcepts: number;
  paths: PathTrajectoryDTO[];
  clusters: ClusterSummaryDTO[];
  frontierConcepts: string[];
  lastActiveGraph: string | null;
  topConvergences: Array<{ source: string; target: string; weight: number; sharedConcepts: string[] }>;
  gaps: Array<{ conceptId: string; name: string; graphId: string; parentConcept: string; pathTitle: string; goalTitle: string }>;
}

export interface CompanionAnalyzeResponse {
  suggestion: Suggestion;
  trajectory: TrajectorySummary;
}

export interface CompanionPersonaDTO {
  name: string;
  description: string;
  portraitUrl?: string;
}

export interface CompanionReplyResponse {
  reply: string;
}
