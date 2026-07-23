import type { Suggestion } from '@kflow-academy/shared';
import type { TranslateFunction } from '@almadar/ui';

export function renderSuggestionTitle(suggestion: Suggestion, t: TranslateFunction): string {
  return t(`companion.suggestion.${suggestion.type}.title`, buildInterpolationParams(suggestion));
}

export function renderSuggestionBody(suggestion: Suggestion, t: TranslateFunction): string {
  return t(`companion.suggestion.${suggestion.type}.body`, buildInterpolationParams(suggestion));
}

function buildInterpolationParams(suggestion: Suggestion): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const { conceptName, clusterName, clusterSize, parentConcept, pathTitle, convergenceConcepts } = suggestion.params;
  if (conceptName) params.conceptName = conceptName;
  if (clusterName) params.clusterName = clusterName;
  if (typeof clusterSize === 'number') params.clusterSize = clusterSize;
  if (parentConcept) params.parentConcept = parentConcept;
  if (pathTitle) params.pathTitle = pathTitle;
  if (convergenceConcepts && convergenceConcepts.length > 0) {
    params.convergenceConcepts = convergenceConcepts.join(', ');
  }
  return params;
}
