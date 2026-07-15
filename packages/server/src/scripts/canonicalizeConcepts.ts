/**
 * Canonicalize concept identities across all of a uid's graphs (union-find backfill).
 *
 * For every Concept in every graph, search the uid's OTHER graphs in Chroma for
 * near-duplicates (cosine ≥ threshold), union the pairs into components, and give
 * every component member the same `canonicalName` — the name of the representative
 * (oldest graph wins; ties → smallest name). Singletons mint their own name as the
 * identity, matching mint-time behavior. After this, `canonicalConceptKey` joins
 * duplicate concepts across graphs and the L1 map's shared-concept edges reflect
 * real overlap.
 *
 * Idempotent: union-find is deterministic, so re-runs converge to the same state.
 *
 * Usage (from packages/server):
 *   npx tsx src/scripts/canonicalizeConcepts.ts <uid> [--dry-run] [--threshold=0.85]
 *   pnpm run canonicalize:concepts -- <uid> [--dry-run] [--threshold=0.85]
 *
 * Default threshold = DEFAULT_CONCEPT_CANONICAL_THRESHOLD (0.9). Cross-graph concept
 * cosine sits at 0.44–0.50 for unrelated mass; the duplicate tail starts ~0.78.
 */

// Env + Firebase init exactly like backfillChroma.ts (see that file for why dynamic).
import '../config/env.js';
import { createLogger } from '@almadar/logger';

const almadarServer = await import('@almadar/server');
almadarServer.initializeFirebase();
almadarServer.getFirestore();

const log = createLogger('kflow:server:scripts:canonicalizeConcepts');

interface ConceptEntry {
  graphId: string;
  nodeId: string;
  name: string;
  queryText: string;
  graphCreatedAt: number;
  currentCanonical?: string;
}

class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root]!;
    while (this.parent[x] !== root) {
      const next = this.parent[x]!;
      this.parent[x] = root;
      x = next;
    }
    return root;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const thresholdArg = args.find((a) => a.startsWith('--threshold='));
  const uid = args.find((a) => !a.startsWith('--')) || 'dev-user-001';

  const {
    KnowledgeGraphAccessLayer,
    buildEmbeddingText,
    DEFAULT_CONCEPT_CANONICAL_THRESHOLD,
  } = await import('@almadar-io/knowledge/server');
  const { listUserGraphIds } = await import('../utils/listUserGraphIds.js');
  const { invalidateLearningPaths } = await import('../services/cacheInvalidation.js');

  const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : DEFAULT_CONCEPT_CANONICAL_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
    throw new Error(`Invalid --threshold value: ${thresholdArg}`);
  }
  log.info(`Canonicalize concepts for uid=${uid}`, { dryRun, threshold });

  const access = new KnowledgeGraphAccessLayer();
  const graphIds = await listUserGraphIds(uid);
  const graphs = await Promise.all(graphIds.map((id) => access.getGraph(uid, id)));
  log.info(`Loaded ${graphs.length} graph(s)`);

  const entries: ConceptEntry[] = [];
  for (const graph of graphs) {
    for (const nodeId of graph.nodeTypes?.Concept ?? []) {
      const node = graph.nodes[nodeId];
      if (!node || node.type !== 'Concept') continue;
      entries.push({
        graphId: graph.id,
        nodeId,
        name: node.properties.name,
        queryText: buildEmbeddingText(node),
        graphCreatedAt: graph.createdAt,
        currentCanonical: node.properties.canonicalName,
      });
    }
  }
  log.info(`Found ${entries.length} concept(s) across ${graphs.length} graph(s)`);

  const indexByKey = new Map<string, number>();
  entries.forEach((e, i) => indexByKey.set(`${e.graphId}:${e.nodeId}`, i));

  const uf = new UnionFind(entries.length);
  let pairsAbove = 0;
  let strongestBelow: { a: string; b: string; score: number } | undefined;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const otherGraphIds = graphIds.filter((id) => id !== entry.graphId);
    if (otherGraphIds.length === 0) continue;
    const hits = await access.findSimilarNodesCrossGraph(uid, otherGraphIds, entry.queryText, 5, ['Concept']);
    for (const hit of hits) {
      const j = indexByKey.get(`${hit.graphId}:${hit.nodeId}`);
      if (j === undefined || j === i) continue;
      if (hit.score >= threshold) {
        uf.union(i, j);
        pairsAbove++;
      } else if (!strongestBelow || hit.score > strongestBelow.score) {
        strongestBelow = { a: entry.name, b: hit.name ?? hit.nodeId, score: hit.score };
      }
    }
  }

  const components = new Map<number, number[]>();
  for (let i = 0; i < entries.length; i++) {
    const root = uf.find(i);
    const members = components.get(root) ?? [];
    members.push(i);
    components.set(root, members);
  }

  // Representative: oldest graph, then smallest name, then smallest nodeId — deterministic.
  const repOf = new Map<number, ConceptEntry>();
  for (const [root, members] of components) {
    const sorted = [...members].map((i) => entries[i]!).sort(
      (a, b) => a.graphCreatedAt - b.graphCreatedAt || a.name.localeCompare(b.name) || a.nodeId.localeCompare(b.nodeId),
    );
    repOf.set(root, sorted[0]!);
  }

  const multi = [...components.values()].filter((m) => m.length > 1);
  log.info(`Union-find: ${components.size} component(s), ${multi.length} merged, ${pairsAbove} pair(s) ≥ ${threshold}`, {
    strongestBelowThreshold: strongestBelow
      ? `${strongestBelow.a} ↔ ${strongestBelow.b} @ ${strongestBelow.score.toFixed(3)}`
      : 'none',
  });

  const changes = new Map<string, Array<{ nodeId: string; from: string | undefined; to: string }>>();
  for (const [root, members] of components) {
    const rep = repOf.get(root)!;
    for (const i of members) {
      const entry = entries[i]!;
      if (entry.currentCanonical === rep.name) continue;
      const list = changes.get(entry.graphId) ?? [];
      list.push({ nodeId: entry.nodeId, from: entry.currentCanonical, to: rep.name });
      changes.set(entry.graphId, list);
    }
  }

  for (const members of multi.sort((a, b) => b.length - a.length)) {
    const rep = repOf.get(uf.find(members[0]!))!;
    log.info(`  cluster "${rep.name}" (${members.length})`, {
      members: members.map((i) => {
        const e = entries[i]!;
        return `${e.name}${e.name === rep.name ? ' [rep]' : ''} @ ${e.graphId.slice(0, 8)}`;
      }),
    });
  }

  const totalChanges = [...changes.values()].reduce((n, list) => n + list.length, 0);
  log.info(`${totalChanges} concept(s) need a canonicalName update across ${changes.size} graph(s)`);
  if (dryRun) {
    log.info('Dry run — no writes. Re-run without --dry-run to apply.');
    return;
  }

  for (const [graphId, updates] of changes) {
    const graph = graphs.find((g) => g.id === graphId)!;
    for (const { nodeId, to } of updates) {
      const node = graph.nodes[nodeId];
      if (node && node.type === 'Concept') node.properties.canonicalName = to;
    }
    await access.saveGraph(uid, graph, graph.version);
    const { embedded } = await access.reindexGraph(uid, graphId);
    log.info(`Updated graph ${graphId}`, { canonicalized: updates.length, reindexed: embedded });
  }

  await invalidateLearningPaths(uid);
  log.info('Canonicalization complete', { graphsTouched: changes.size, conceptsUpdated: totalChanges });
}

main().catch((e) => {
  log.error('Canonicalize script crashed', {
    error: e instanceof Error ? e.message : String(e),
  });
  process.exit(1);
});
