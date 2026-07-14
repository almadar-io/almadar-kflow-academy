/**
 * useLearningPathMap — top-level knowledge map: one node per learning PATH, with an
 * edge between two paths for every concept they share. Concept ids ARE concept names,
 * so "shared" is a deterministic id-set intersection (no fuzzy/similarity matching).
 * Edges are unlabeled; node `size` scales with the path's concept count.
 *
 * Clustering (for color groups) unions paths that share a concept OR whose direct
 * path↔path cosine similarity (from the server) clears CLUSTER_SIMILARITY. Drawn links
 * use the higher DRAW_SIMILARITY so the canvas stays readable. The FULL similarity
 * matrix is also returned (rewired to rendered node ids) purely for GraphCanvas layout.
 *
 * Merging (collapse duplicate paths into one node with a count badge) groups paths by
 * EXACT normalized title only — no transitive semantic chaining. A merged group that is
 * not in `expandedGroups` renders as a single representative node carrying `badge`
 * (member count); clicking the badge adds the group id to `expandedGroups` so the
 * members render individually.
 *
 * Each path's concepts are fetched client-side in parallel (useQueries), reusing the same
 * query cache as the per-path concept views.
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { GraphNode, GraphEdge, GraphSimilarity } from '@almadar/ui';
import type { PathSimilarityEdge } from '../api/types';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';

export interface LearningPathInput {
  graphId: string;
  name: string;
  conceptCount: number;
}

export type LearningPathMapNode = GraphNode & {
  graphId: string;
  /** When this node is a collapsed merge group, the member path graphIds. */
  mergedIds?: string[];
};

export interface LearningPathMap {
  nodes: LearningPathMapNode[];
  edges: GraphEdge[];
  /** Full path-similarity matrix (rewired to rendered node ids) — layout only. */
  similarity: GraphSimilarity[];
}

const CONCEPT_OPTS = { includeRelationships: false } as const;
const FIVE_MIN = 5 * 60 * 1000;

/** Cosine ≥ this unions two paths into one color cluster. */
const CLUSTER_SIMILARITY = 0.45;
/** Cosine ≥ this draws a link on the canvas (higher, so the map stays readable). */
const DRAW_SIMILARITY = 0.55;

function makeUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i);
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
  return { find, union };
}

/** Normalize a path title for duplicate detection (case/punctuation/spacing-insensitive). */
function titleKey(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const id of small) if (large.has(id)) inter++;
  return inter / (a.size + b.size - inter);
}

export function computeSemanticPathMap(
  paths: LearningPathInput[],
  conceptIdSets: Set<string>[],
  similarity: PathSimilarityEdge[] = [],
  expandedGroups: Set<string> = new Set()
): LearningPathMap | undefined {
  if (paths.length === 0) return undefined;

  const maxConcepts = Math.max(1, ...paths.map((p) => p.conceptCount));
  const indexOf = new Map(paths.map((p, i) => [p.graphId, i] as const));

  // --- Cluster union-find: shared concepts + high-similarity pairs → color groups ---
  const cluster = makeUnionFind(paths.length);

  const sharedEdges: GraphEdge[] = [];
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      if (jaccard(conceptIdSets[i], conceptIdSets[j]) > 0) {
        cluster.union(i, j);
        sharedEdges.push({ source: paths[i].graphId, target: paths[j].graphId });
      }
    }
  }

  // Union only genuinely similar paths (≥ CLUSTER_SIMILARITY). The old proxy unioned
  // ANY cross-graph hit regardless of score, chaining whole topic clusters into one badge.
  for (const se of similarity) {
    if (se.weight < CLUSTER_SIMILARITY) continue;
    const si = indexOf.get(se.source);
    const ti = indexOf.get(se.target);
    if (si === undefined || ti === undefined) continue;
    cluster.union(si, ti);
  }

  // Stable cluster ids per path.
  const clusterOf = new Map<number, string>();
  let nextCluster = 0;
  const pathCluster: string[] = paths.map((_, i) => {
    const root = cluster.find(i);
    let c = clusterOf.get(root);
    if (c === undefined) {
      c = `cluster-${nextCluster++}`;
      clusterOf.set(root, c);
    }
    return c;
  });

  // --- Merge union-find: near-duplicate paths → collapse into one node --------------
  const merge = makeUnionFind(paths.length);
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      if (titleKey(paths[i].name) === titleKey(paths[j].name)) merge.union(i, j);
    }
  }

  // Group member indices by merge-root.
  const mergeGroups = new Map<number, number[]>();
  for (let i = 0; i < paths.length; i++) {
    const root = merge.find(i);
    const arr = mergeGroups.get(root);
    if (arr) arr.push(i);
    else mergeGroups.set(root, [i]);
  }

  // A group is collapsed when it has ≥2 members and its id is not expanded.
  // Group id is stable: `merge:<lexicographically-smallest member graphId>`.
  const memberToGroupId = new Map<number, string>();
  const collapsedGroupIds = new Set<string>();
  for (const [, members] of mergeGroups) {
    if (members.length < 2) continue;
    const graphIds = members.map((m) => paths[m].graphId).sort();
    const groupId = `merge:${graphIds[0]}`;
    for (const m of members) memberToGroupId.set(m, groupId);
    if (!expandedGroups.has(groupId)) collapsedGroupIds.add(groupId);
  }

  // Map each path index to its effective node id (representative id when collapsed).
  const effectiveId = (i: number): string => {
    const gid = memberToGroupId.get(i);
    if (gid && collapsedGroupIds.has(gid)) return gid;
    return paths[i].graphId;
  };

  // --- Build nodes: representatives for collapsed groups, else individuals ----------
  const nodeSizeFor = (count: number) => 6 + Math.round((count / maxConcepts) * 10); // 6..16

  const nodes: LearningPathMapNode[] = [];
  const seenNodeId = new Set<string>();

  for (let i = 0; i < paths.length; i++) {
    const gid = memberToGroupId.get(i);
    if (gid && collapsedGroupIds.has(gid)) {
      if (seenNodeId.has(gid)) continue; // representative already emitted
      seenNodeId.add(gid);
      const members = mergeGroups.get(merge.find(i))!.map((m) => paths[m]);
      members.sort((a, b) => b.conceptCount - a.conceptCount);
      const rep = members[0];
      nodes.push({
        id: gid,
        label: rep.name,
        graphId: rep.graphId,
        group: pathCluster[i],
        size: nodeSizeFor(Math.max(...members.map((m) => m.conceptCount))) + 2,
        badge: members.length,
        mergedIds: members.map((m) => m.graphId),
      });
    } else {
      nodes.push({
        id: paths[i].graphId,
        label: paths[i].name,
        graphId: paths[i].graphId,
        group: pathCluster[i],
        size: nodeSizeFor(paths[i].conceptCount),
      });
      seenNodeId.add(paths[i].graphId);
    }
  }

  const edgeKey = (s: string, t: string) => (s < t ? `${s}\0${t}` : `${t}\0${s}`);

  // --- Drawn edges: shared-concept links + similarity pairs ≥ DRAW_SIMILARITY -------
  const rawEdges: GraphEdge[] = [
    ...sharedEdges,
    ...similarity
      .filter((se) => se.weight >= DRAW_SIMILARITY)
      .map((se) => ({ source: se.source, target: se.target, weight: se.weight })),
  ];

  const edgeWeight = new Map<string, number>();
  for (const e of rawEdges) {
    const si = indexOf.get(e.source);
    const ti = indexOf.get(e.target);
    if (si === undefined || ti === undefined) continue;
    const s = effectiveId(si);
    const t = effectiveId(ti);
    if (s === t) continue; // intra-group
    const k = edgeKey(s, t);
    const w = e.weight ?? 1;
    edgeWeight.set(k, Math.max(edgeWeight.get(k) ?? 0, w));
  }
  const edges: GraphEdge[] = [...edgeWeight.entries()].map(([k, w]) => {
    const [s, t] = k.split('\0');
    return { source: s, target: t, weight: w };
  });

  // --- Full similarity matrix, rewired to rendered node ids, for layout only --------
  const simByKey = new Map<string, number>();
  for (const se of similarity) {
    const si = indexOf.get(se.source);
    const ti = indexOf.get(se.target);
    if (si === undefined || ti === undefined) continue;
    const s = effectiveId(si);
    const t = effectiveId(ti);
    if (s === t) continue;
    const k = edgeKey(s, t);
    simByKey.set(k, Math.max(simByKey.get(k) ?? 0, se.weight));
  }
  const similarityOut: GraphSimilarity[] = [...simByKey.entries()].map(([k, w]) => {
    const [s, t] = k.split('\0');
    return { source: s, target: t, weight: w };
  });

  return { nodes, edges, similarity: similarityOut };
}

export function useLearningPathMap(
  paths: LearningPathInput[],
  similarity: PathSimilarityEdge[] = [],
  expandedGroups: Set<string> = new Set()
): LearningPathMap | undefined {
  const results = useQueries({
    queries: paths.map((p) => ({
      queryKey: knowledgeGraphKeys.conceptsByLayer(p.graphId, CONCEPT_OPTS),
      queryFn: () => graphQueryApi.getConceptsByLayer(p.graphId, CONCEPT_OPTS),
      enabled: p.graphId.length > 0,
      staleTime: FIVE_MIN,
    })),
  });

  // Recompute only when loaded data actually changes (avoids re-laying-out the force graph every render).
  const fingerprint = results.map((r: { dataUpdatedAt?: number }) => r.dataUpdatedAt).join('|');

  return useMemo(() => {
    const conceptIdSets: Set<string>[] = paths.map(
      (_, i) => new Set<string>((results[i]?.data?.concepts ?? []).map((c: { id: string }) => c.id))
    );
    return computeSemanticPathMap(paths, conceptIdSets, similarity, expandedGroups);
    // `results` is read above but intentionally NOT a dep (it's a fresh array every render); `fingerprint`
    // captures its loaded-data identity, so the force graph only re-lays-out when concept data changes.
  }, [fingerprint, paths, similarity, expandedGroups]);
}
