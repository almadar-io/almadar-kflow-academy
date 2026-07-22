export type SuggestionType = 'expand' | 'study' | 'review' | 'connect' | 'discover';

export interface Suggestion {
  type: SuggestionType;
  title: string;
  body: string;
  action: string;
  target: string;
}

export interface TrajectorySummary {
  totalPaths: number;
  totalConcepts: number;
  clusters: Array<{ id: string; name: string; size: number }>;
  frontierConcepts: string[];
  lastActiveGraph: string | null;
  topConvergences: Array<{ source: string; target: string; weight: number; sharedConcepts: string[] }>;
  gaps: Array<{ conceptId: string; name: string; reason: string }>;
}

export interface CompanionAnalyzeResponse {
  suggestion: Suggestion;
  trajectory: TrajectorySummary;
}

export interface CompanionReplyResponse {
  reply: string;
}
