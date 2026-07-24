import type { Suggestion } from '@kflow-academy/shared';
import type { TranslateFunction } from '@almadar/ui';

export function renderSuggestionTitle(suggestion: Suggestion, t: TranslateFunction): string {
  return t(`companion.suggestion.${suggestion.type}.title`, buildInterpolationParams(suggestion));
}

export function renderSuggestionBody(suggestion: Suggestion, t: TranslateFunction): string {
  if (suggestion.reasoning && suggestion.reasoning.trim().length > 0) {
    return suggestion.reasoning;
  }
  return t(`companion.suggestion.${suggestion.type}.body`, buildInterpolationParams(suggestion));
}

function buildInterpolationParams(suggestion: Suggestion): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const p = suggestion.params;
  if (p.conceptName) params.conceptName = p.conceptName;
  if (p.clusterName) params.clusterName = p.clusterName;
  if (typeof p.clusterSize === 'number') params.clusterSize = p.clusterSize;
  if (p.parentConcept) params.parentConcept = p.parentConcept;
  if (p.pathTitle) params.pathTitle = p.pathTitle;
  if (p.goalTitle) params.goalTitle = p.goalTitle;
  if (typeof p.missingCount === 'number') params.missingCount = p.missingCount;
  if (p.missingConcepts && p.missingConcepts.length > 0) {
    params.missingConcepts = p.missingConcepts.join(', ');
  }
  if (typeof p.totalConcepts === 'number') params.totalConcepts = p.totalConcepts;
  if (typeof p.studiedCount === 'number') params.studiedCount = p.studiedCount;
  if (p.convergenceConcepts && p.convergenceConcepts.length > 0) {
    params.convergenceConcepts = p.convergenceConcepts.join(', ');
  }
  return params;
}
