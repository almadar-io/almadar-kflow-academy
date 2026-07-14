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

/** Jaccard (shared-concept overlap) ≥ this unions two paths into one color cluster. */
const CLUSTER_JACCARD = 0.05;
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

export function computeSemanticPathMap(
  paths: LearningPathInput[],
  sharedConcepts: SharedConceptEdge[] = [],
  similarity: PathSimilarityEdge[] = [],
  expandedGroups: Set<string> = new Set()
): LearningPathMap | undefined {
  if (paths.length === 0) return undefined;

  const maxConcepts = Math.max(1, ...paths.map((p) => p.conceptCount));
  const indexOf = new Map(paths.map((p, i) => [p.graphId, i] as const));

  // --- Cluster union-find → color groups ---------------------------------------------
  // A color group = a connected component of the SHARED-CONCEPT graph: two paths are the
  // same color when linked (transitively) by paths that teach overlapping concepts. The
  // overlap must clear CLUSTER_JACCARD so a single incidental shared concept doesn't chain
  // the whole map into one color. Cosine similarity is NOT used for grouping (see below).
  const cluster = makeUnionFind(paths.length);

  const sharedEdges: GraphEdge[] = [];
  const jacPairs: Array<readonly [number, number, number]> = []; // i, j, jaccard
  for (const se of sharedConcepts) {
    const si = indexOf.get(se.source);
    const ti = indexOf.get(se.target);
    if (si === undefined || ti === undefined) continue;
    // Drawn unweighted (weight defaults to 1 downstream): the original uniform look.
    sharedEdges.push({ source: se.source, target: se.target });
    jacPairs.push([si, ti, se.weight]);
    if (se.weight >= CLUSTER_JACCARD) cluster.union(si, ti);
  }

  // Cosine pairs are collected for layout + diagnostics only — NOT for color grouping.
  // Path embeddings form a continuum here (no natural gap to cut), so a cosine threshold
  // chains everything into one color; shared concepts are the interpretable grouping signal.
  const simPairs: Array<readonly [number, number, number]> = []; // i, j, cosine
  for (const se of similarity) {
    const si = indexOf.get(se.source);
    const ti = indexOf.get(se.target);
    if (si === undefined || ti === undefined) continue;
    simPairs.push([si, ti, se.weight]);
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

  // Color groups: only clusters with ≥2 members get a distinct color + cluster gravity;
  // singletons stay UNGROUPED (GraphCanvas renders them neutral with gentle global
  // centering only) so genuinely-related clusters pop and the legend stays small.
  const clusterSize = new Map<string, number>();
  for (const c of pathCluster) clusterSize.set(c, (clusterSize.get(c) ?? 0) + 1);
  const colorGroup: (string | undefined)[] = pathCluster.map((c) => (clusterSize.get(c)! >= 2 ? c : undefined));

  // TEMP diagnostic: connected-component sizes under candidate cluster rules (remove before ship).
  const comps = (pairs: Array<readonly [number, number, number]>, thr: number): number[] => {
    const uf = makeUnionFind(paths.length);
    for (const [a, b, w] of pairs) if (w >= thr) uf.union(a, b);
    const sz = new Map<number, number>();
    for (let i = 0; i < paths.length; i++) {
      const r = uf.find(i);
      sz.set(r, (sz.get(r) ?? 0) + 1);
    }
    return [...sz.values()].sort((a, b) => b - a);
  };
  console.log('[L1-MAP] cluster options (component sizes per rule)', {
    jac_any: comps(jacPairs, 0),
    jac_05: comps(jacPairs, 0.05),
    jac_08: comps(jacPairs, 0.08),
    jac_12: comps(jacPairs, 0.12),
    sim_65: comps(simPairs, 0.65),
    sim_70: comps(simPairs, 0.7),
    sim_75: comps(simPairs, 0.75),
    sim_80: comps(simPairs, 0.8),
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
        group: colorGroup[i],
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
