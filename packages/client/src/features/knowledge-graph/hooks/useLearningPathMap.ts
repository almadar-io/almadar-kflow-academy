/**
 * useLearningPathMap — top-level knowledge map: one node per learning PATH, with an
 * edge between two paths for every concept they share. Concept ids ARE concept names,
 * so "shared" is a deterministic id-set intersection, computed SERVER-SIDE where all
 * graphs are already loaded and shipped in the /learning-paths payload (no per-path
 * concept fan-out from the client). Edges are unlabeled; node `size` scales with the
 * path's concept count.
 *
 * Clustering (for color groups) unions paths whose shared-concept jaccard (the server
 * edge weight) clears CLUSTER_JACCARD, so a single incidental shared concept doesn't
 * chain the whole map into one color. Cosine similarity is NOT used for grouping: path
 * embeddings form a continuum (no natural gap to cut), so a cosine threshold chains
 * everything into one color. Cosine drives the force layout, plus drawn links at the
 * higher DRAW_SIMILARITY. The FULL similarity matrix is also returned (rewired to
 * rendered node ids) purely for GraphCanvas layout.
 *
 * Merging (collapse duplicate paths into one node with a count badge) groups paths by
 * EXACT normalized title only — no transitive semantic chaining. A merged group that is
 * not in `expandedGroups` renders as a single representative node carrying `badge`
 * (member count); clicking the badge adds the group id to `expandedGroups` so the
 * members render individually.
 */
import { useMemo } from 'react';
import type { GraphNode, GraphEdge, GraphSimilarity } from '@almadar/ui';
import type { PathSimilarityEdge, SharedConceptEdge } from '../api/types';

export interface LearningPathInput {
  graphId: string;
  name: string;
  conceptCount: number;
  /** Server-assigned topic cluster (max-coverage shared concept); absent for singletons. */
  cluster?: { id: string; name: string };
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

/** Normalize a path title for duplicate detection (case/punctuation/spacing-insensitive). */
/** Cosine ≥ this draws a link on the canvas (higher, so the map stays readable). */
const DRAW_SIMILARITY = 0.55;
/** Singletons (share no concepts) stay ungrouped for gravity, but render violet — not the
 * muted grey that reads as "disabled". Kept off the GraphCanvas group palette. */
const SINGLETON_COLOR = '#8b5cf6';

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

export function computeSemanticPathMap(
  paths: LearningPathInput[],
  sharedConcepts: SharedConceptEdge[] = [],
  similarity: PathSimilarityEdge[] = [],
  expandedGroups: Set<string> = new Set()
): LearningPathMap | undefined {
  if (paths.length === 0) return undefined;

  const maxConcepts = Math.max(1, ...paths.map((p) => p.conceptCount));
  const indexOf = new Map(paths.map((p, i) => [p.graphId, i] as const));

  // --- Shared-concept edges (drawn links) + server clusters ------------------------
  // Clusters are assigned SERVER-SIDE (max-coverage shared concept — see
  // @almadar-io/knowledge assignClusters). Each path carries its cluster name; the
  // GraphCanvas hashes the name into a stable color and shows it in the legend.
  // Singletons (no cluster) stay ungrouped so unrelated paths don't get a false color.
  const sharedEdges: GraphEdge[] = [];
  for (const se of sharedConcepts) {
    const si = indexOf.get(se.source);
    const ti = indexOf.get(se.target);
    if (si === undefined || ti === undefined) continue;
    sharedEdges.push({ source: se.source, target: se.target });
  }

  // Only clusters with ≥2 rendered members get a color group (singletons stay neutral).
  const clusterMemberCount = new Map<string, number>();
  for (const p of paths) {
    if (p.cluster) clusterMemberCount.set(p.cluster.name, (clusterMemberCount.get(p.cluster.name) ?? 0) + 1);
  }
  const colorGroup: (string | undefined)[] = paths.map((p) =>
    p.cluster && (clusterMemberCount.get(p.cluster.name) ?? 0) >= 2 ? p.cluster.name : undefined,
  );

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
        group: colorGroup[i],
        color: colorGroup[i] ? undefined : SINGLETON_COLOR,
        size: nodeSizeFor(Math.max(...members.map((m) => m.conceptCount))) + 2,
        badge: members.length,
        mergedIds: members.map((m) => m.graphId),
      });
    } else {
      nodes.push({
        id: paths[i].graphId,
        label: paths[i].name,
        graphId: paths[i].graphId,
        group: colorGroup[i],
        color: colorGroup[i] ? undefined : SINGLETON_COLOR,
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
  sharedConcepts: SharedConceptEdge[] = [],
  expandedGroups: Set<string> = new Set()
): LearningPathMap | undefined {
  return useMemo(
    () => computeSemanticPathMap(paths, sharedConcepts, similarity, expandedGroups),
    [paths, sharedConcepts, similarity, expandedGroups]
  );
}
