/**
 * useLearningPathMap — top-level knowledge map: one node per learning PATH, with an
 * edge between two paths for every concept they share. Concept ids ARE concept names,
 * so "shared" is a deterministic id-set intersection (no fuzzy/similarity matching).
 * Edges are unlabeled; node `size` scales with the path's concept count.
 *
 * Each path's concepts are fetched client-side in parallel (useQueries), reusing the same
 * query cache as the per-path concept views.
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { GraphViewNode, GraphViewEdge } from '@almadar/ui';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';

export interface LearningPathInput {
  graphId: string;
  name: string;
  conceptCount: number;
}

export type LearningPathMapNode = GraphViewNode & { graphId: string };

export interface LearningPathMap {
  nodes: LearningPathMapNode[];
  edges: GraphViewEdge[];
}

const CONCEPT_OPTS = { includeRelationships: false } as const;
const FIVE_MIN = 5 * 60 * 1000;

export function useLearningPathMap(paths: LearningPathInput[]): LearningPathMap | undefined {
  const results = useQueries({
    queries: paths.map((p) => ({
      queryKey: knowledgeGraphKeys.conceptsByLayer(p.graphId, CONCEPT_OPTS),
      queryFn: () => graphQueryApi.getConceptsByLayer(p.graphId, CONCEPT_OPTS),
      enabled: p.graphId.length > 0,
      staleTime: FIVE_MIN,
    })),
  });

  // Recompute only when loaded data actually changes (avoids re-laying-out the force graph every render).
  const fingerprint = results.map((r) => r.dataUpdatedAt).join('|');

  return useMemo(() => {
    if (paths.length === 0) return undefined;

    const conceptIdSets = paths.map(
      (_, i) => new Set((results[i]?.data?.concepts ?? []).map((c) => c.id))
    );
    const maxConcepts = Math.max(1, ...paths.map((p) => p.conceptCount));

    // Union-find over the shared-concept edges so each connected component becomes a
    // distinct color cluster. Singleton paths stay their own component.
    const parent = paths.map((_, i) => i);
    const find = (i: number): number => {
      let root = i;
      while (parent[root] !== root) root = parent[root];
      while (parent[i] !== root) {
        const next = parent[i];
        parent[i] = root;
        i = next;
      }
      return root;
    };
    const union = (a: number, b: number): void => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    const edges: GraphViewEdge[] = [];
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const [small, large] =
          conceptIdSets[i].size <= conceptIdSets[j].size
            ? [conceptIdSets[i], conceptIdSets[j]]
            : [conceptIdSets[j], conceptIdSets[i]];
        let shared = 0;
        for (const id of small) if (large.has(id)) shared++;
        if (shared > 0) {
          union(i, j);
          edges.push({ source: paths[i].graphId, target: paths[j].graphId });
        }
      }
    }

    // Map each component root to a stable, contiguous cluster id (cluster-0, cluster-1, ...).
    const clusterOf = new Map<number, string>();
    let nextCluster = 0;
    const nodes: LearningPathMapNode[] = paths.map((p, i) => {
      const root = find(i);
      let cluster = clusterOf.get(root);
      if (cluster === undefined) {
        cluster = `cluster-${nextCluster++}`;
        clusterOf.set(root, cluster);
      }
      return {
        id: p.graphId,
        label: p.name,
        graphId: p.graphId,
        group: cluster,
        size: 6 + Math.round((p.conceptCount / maxConcepts) * 10), // 6..16 by relative size
      };
    });

    return { nodes, edges };
    // `results` is read above but intentionally NOT a dep (it's a fresh array every render); `fingerprint`
    // captures its loaded-data identity, so the force graph only re-lays-out when concept data changes.
  }, [fingerprint, paths]);
}
