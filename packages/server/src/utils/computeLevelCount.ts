import { getConceptsByLayer } from '@almadar-io/knowledge/server';
import type { NodeBasedKnowledgeGraph } from '@kflow-academy/shared';

/**
 * Compute the number of learning levels in a node-based knowledge graph.
 *
 * Levels correspond to the layer groupings produced by `getConceptsByLayer`.
 * Layer 0 is the seed/goal concept and is excluded from the count, matching
 * what the concept detail page displays (`layers.filter(l => l.layerNum > 0)`).
 */
export function computeLevelCount(graph: NodeBasedKnowledgeGraph | null | undefined): number {
  if (!graph?.nodes) return 0;

  const { groupedByLayer } = getConceptsByLayer(graph, {
    groupByLayer: true,
    includeRelationships: false,
  });

  if (!groupedByLayer) return 0;

  return Object.keys(groupedByLayer)
    .map(Number)
    .filter(layer => layer > 0)
    .length;
}
