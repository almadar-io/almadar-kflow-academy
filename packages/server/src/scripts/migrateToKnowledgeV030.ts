/**
 * One-time migration: knowledge graph nodes to @almadar-io/knowledge v0.3.0 shapes.
 *
 * REMOVED node types → drop them (kflow is the learner app; nata owns publishing):
 *   CourseSettings, ModuleSettings, LessonSettings, AssessmentQuestion,
 *   Series, Season, Episode
 *
 * CHANGED node type: Story
 *   Old shape: { id, title, content?, steps?, ... } (flat)
 *   New shape: { id, title, teaser, steps: StoryStep[], rating?, playCount?, cover?, createdAt, updatedAt }
 *
 * DO NOT RUN THIS SCRIPT without a Firestore backup.
 * Run with: npx tsx src/scripts/migrateToKnowledgeV030.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { StoryNodeProperties, StoryStep, JsonValue } from '@almadar-io/knowledge';
import { propsToRecord } from '@almadar-io/knowledge';

interface RawNode {
  type: string;
  properties?: Record<string, JsonValue>;
}
interface RawGraphDoc {
  nodes?: Record<string, RawNode>;
  relationships?: Array<Record<string, JsonValue>>;
  nodeTypes?: Record<string, string[]>;
}

const REMOVED_NODE_TYPES = new Set([
  'CourseSettings',
  'ModuleSettings',
  'LessonSettings',
  'AssessmentQuestion',
  'Series',
  'Season',
  'Episode',
]);

const REMOVED_RELATIONSHIP_TYPES = new Set([
  'hasCourseSettings',
  'hasModuleSettings',
  'hasLessonSettings',
]);

async function migrateGraph(
  db: FirebaseFirestore.Firestore,
  uid: string,
  graphId: string
): Promise<{ nodesRemoved: number; relationshipsRemoved: number; storiesUpdated: number }> {
  const ref = db.collection('users').doc(uid).collection('graphs').doc(graphId);
  const snap = await ref.get();
  if (!snap.exists) return { nodesRemoved: 0, relationshipsRemoved: 0, storiesUpdated: 0 };

  const data = (snap.data() ?? {}) as RawGraphDoc;
  const nodes = data.nodes ?? {};
  const relationships = data.relationships ?? [];
  const nodeTypes = data.nodeTypes ?? {};

  let nodesRemoved = 0;
  let storiesUpdated = 0;

  // Remove deprecated nodes and upgrade Story nodes
  const updatedNodes: Record<string, RawNode> = {};
  for (const [nodeId, node] of Object.entries(nodes)) {
    const nodeType = node.type;
    if (REMOVED_NODE_TYPES.has(nodeType)) {
      nodesRemoved++;
      continue;
    }
    if (nodeType === 'Story') {
      const props = node.properties ?? {};
      if (!props.teaser || !Array.isArray(props.steps)) {
        // Upgrade to v0.3.0 StoryNodeProperties shape
        const now = Date.now();
        const steps: StoryStep[] = [];
        if (typeof props.content === 'string' && props.content) {
          steps.push({
            id: `${nodeId}-step-0`,
            kind: 'narrative',
            narrativeText: props.content as string,
          });
        }
        const newProps: StoryNodeProperties = {
          id: props.id as string || nodeId,
          title: props.title as string || '',
          teaser: typeof props.description === 'string' ? props.description : '',
          steps,
          createdAt: props.createdAt as number || now,
          updatedAt: now,
        };
        updatedNodes[nodeId] = { ...node, properties: propsToRecord(newProps) };
        storiesUpdated++;
        continue;
      }
    }
    updatedNodes[nodeId] = node;
  }

  // Remove relationships involving deleted nodes or removed relationship types
  const remainingNodeIds = new Set(Object.keys(updatedNodes));
  const updatedRelationships = relationships.filter(rel => {
    const relType = rel.type as string;
    if (REMOVED_RELATIONSHIP_TYPES.has(relType)) return false;
    if (!remainingNodeIds.has(rel.source as string)) return false;
    if (!remainingNodeIds.has(rel.target as string)) return false;
    return true;
  });
  const relationshipsRemoved = relationships.length - updatedRelationships.length;

  // Rebuild nodeTypes index without removed types
  const updatedNodeTypes: Record<string, string[]> = {};
  for (const [type, ids] of Object.entries(nodeTypes)) {
    if (REMOVED_NODE_TYPES.has(type)) continue;
    const filteredIds = (ids as string[]).filter(id => remainingNodeIds.has(id));
    if (filteredIds.length > 0) {
      updatedNodeTypes[type] = filteredIds;
    }
  }

  await ref.update({
    nodes: updatedNodes,
    relationships: updatedRelationships,
    nodeTypes: updatedNodeTypes,
    updatedAt: Date.now(),
  });

  return { nodesRemoved, relationshipsRemoved, storiesUpdated };
}

async function main() {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountPath) {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path');
  }
  initializeApp({ credential: cert(serviceAccountPath) });
  const db = getFirestore();

  const usersSnap = await db.collection('users').get();
  let totalNodesRemoved = 0;
  let totalRelationshipsRemoved = 0;
  let totalStoriesUpdated = 0;
  let graphsMigrated = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const graphsSnap = await db.collection('users').doc(uid).collection('graphs').get();
    for (const graphDoc of graphsSnap.docs) {
      const result = await migrateGraph(db, uid, graphDoc.id);
      totalNodesRemoved += result.nodesRemoved;
      totalRelationshipsRemoved += result.relationshipsRemoved;
      totalStoriesUpdated += result.storiesUpdated;
      if (result.nodesRemoved || result.relationshipsRemoved || result.storiesUpdated) {
        graphsMigrated++;
        console.log(`  graph ${graphDoc.id}: -${result.nodesRemoved} nodes, -${result.relationshipsRemoved} rels, ${result.storiesUpdated} stories upgraded`);
      }
    }
  }

  console.log(`\nMigration complete: ${graphsMigrated} graphs updated`);
  console.log(`  Nodes removed: ${totalNodesRemoved}`);
  console.log(`  Relationships removed: ${totalRelationshipsRemoved}`);
  console.log(`  Story nodes upgraded: ${totalStoriesUpdated}`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
