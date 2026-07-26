import { createLogger } from '@almadar/logger';
import type { FieldValue, JsonValue } from '@almadar/core';
import type {
  CommitResult,
  DeterministicMapping,
  ExistingRowsQuerier,
  ImportSink,
  MigrationTarget,
} from '@almadar-io/migration';
import { accessLayer } from './studentDataAccess';
import {
  createGraphNode,
  createRelationship,
  createEmptyNodeTypeIndex,
  propsToRecord,
} from '../types/nodeBasedKnowledgeGraph';
import type { NodeBasedKnowledgeGraph, NodeType } from '../types/nodeBasedKnowledgeGraph';
import { generateConceptId } from '../utils/uuid';
import { invalidateLearningPaths, invalidateJumpBackIn } from './cacheInvalidation';

const log = createLogger('kflow:server:migrationService');

// kflow's importable surface (Almadar_Migrations.md §3.1/§4.6). Fields mirror the node
// property shapes the access layer writes (schema/index.ts in @almadar-io/knowledge);
// 'lesson' on Concept is the §4.3 `content → lesson` slot — the sink turns it into a
// child Lesson node + hasLesson edge, mirroring graphOperationParsers.
export const KFLOW_MIGRATION_TARGET: MigrationTarget = {
  entities: [
    {
      name: 'Concept',
      display: { singular: 'Concept', plural: 'Concepts' },
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
        { name: 'lesson', type: 'string' },
      ],
    },
    {
      name: 'Lesson',
      display: { singular: 'Lesson', plural: 'Lessons' },
      fields: [{ name: 'content', type: 'string', required: true }],
    },
    {
      name: 'FlashCard',
      display: { singular: 'Flash card', plural: 'Flash cards' },
      fields: [
        { name: 'front', type: 'string', required: true },
        { name: 'back', type: 'string', required: true },
      ],
    },
    {
      name: 'LearningGoal',
      display: { singular: 'Learning goal', plural: 'Learning goals' },
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
      ],
    },
  ],
  relationships: [
    { type: 'containsConcept', from: 'LearningGoal', to: 'Concept' },
    { type: 'containsConcept', from: 'Concept', to: 'Concept' },
    { type: 'hasLesson', from: 'Concept', to: 'Lesson' },
    { type: 'hasFlashCard', from: 'Concept', to: 'FlashCard' },
    { type: 'hasLearningGoal', from: 'Graph', to: 'LearningGoal' },
  ],
};

// §4.3/§6: title → name, content → lesson; Q/A-flagged units map to FlashCard front/back.
export const KFLOW_DETERMINISTIC_MAPPING: DeterministicMapping = {
  unitTargets: { root: 'LearningGoal', folder: 'Concept', section: 'Concept', qa: 'FlashCard' },
  fieldMappings: {
    LearningGoal: { title: 'name', content: 'description' },
    Concept: { title: 'name', content: 'lesson' },
    FlashCard: { title: 'front', content: 'back', front: 'front', back: 'back' },
  },
};

const IMPORT_RELATIONSHIP_TYPES = ['containsConcept', 'hasLesson', 'hasFlashCard', 'hasLearningGoal'] as const;
type ImportRelationshipType = (typeof IMPORT_RELATIONSHIP_TYPES)[number];

function toRelationshipType(type: string): ImportRelationshipType {
  if ((IMPORT_RELATIONSHIP_TYPES as readonly string[]).includes(type)) return type as ImportRelationshipType;
  throw new Error(`relationship type '${type}' is not declared in kflow's migration target`);
}

const IMPORT_ENTITY_NODE_TYPES: Record<string, NodeType> = {
  Concept: 'Concept',
  Lesson: 'Lesson',
  FlashCard: 'FlashCard',
  LearningGoal: 'LearningGoal',
};

function stringField(fields: Record<string, FieldValue>, key: string): string | undefined {
  const value = fields[key];
  return typeof value === 'string' ? value : undefined;
}

interface CreatedRow {
  id: string;
  entity: string;
}

/** ImportSink over KnowledgeGraphAccessLayer: createEntityRow → createNode (+ scaffold edges). */
export class KflowImportSink implements ImportSink {
  private readonly uid: string;
  private readonly graphId: string;
  private readonly created: CreatedRow[] = [];
  private readonly linkedTargets = new Set<string>();

  constructor(uid: string, graphId: string) {
    this.uid = uid;
    this.graphId = graphId;
  }

  async createEntityRow(entity: string, fields: Record<string, FieldValue>): Promise<string> {
    switch (entity) {
      case 'Concept':
        return this.createConcept(fields);
      case 'Lesson':
        return this.createLesson(fields);
      case 'FlashCard':
        return this.createFlashCard(fields);
      case 'LearningGoal':
        return this.createLearningGoal(fields);
      default:
        throw new Error(`entity '${entity}' is not declared in kflow's migration target`);
    }
  }

  async createRelationship(type: string, fromId: string, toId: string): Promise<void> {
    const relationship = createRelationship(fromId, toId, toRelationshipType(type), 'forward');
    await accessLayer.createRelationship(this.uid, this.graphId, relationship);
    this.linkedTargets.add(toId);
  }

  async commit(jobId: string): Promise<CommitResult> {
    const failed: { ref: string; reason: string }[] = [];
    // Top-level concepts with no incoming edge attach to the graph itself — the same
    // graph → containsConcept scaffold edge goalController writes for seed concepts.
    for (const row of this.created) {
      if (row.entity !== 'Concept' || this.linkedTargets.has(row.id)) continue;
      try {
        await this.createRelationship('containsConcept', this.graphId, row.id);
      } catch (e) {
        failed.push({ ref: row.id, reason: e instanceof Error ? e.message : String(e) });
      }
    }
    let committed = 0;
    for (const row of this.created) {
      const node = await accessLayer.getNode(this.uid, this.graphId, row.id);
      if (node !== null) committed += 1;
      else failed.push({ ref: row.id, reason: 'node missing after write' });
    }
    await invalidateLearningPaths(this.uid);
    await invalidateJumpBackIn(this.uid);
    log.info('import committed', { jobId, graphId: this.graphId, committed, failed: failed.length });
    return { committed, failed };
  }

  private async createConcept(fields: Record<string, FieldValue>): Promise<string> {
    const id = generateConceptId();
    const node = createGraphNode(id, 'Concept', {
      id,
      name: stringField(fields, 'name') ?? 'Untitled concept',
      description: stringField(fields, 'description') ?? '',
      isAutoGenerated: true,
    });
    await accessLayer.createNode(this.uid, this.graphId, node);
    this.created.push({ id, entity: 'Concept' });
    const lesson = stringField(fields, 'lesson');
    if (lesson !== undefined && lesson.trim().length > 0) {
      const lessonId = `lesson-${id}`;
      const lessonNode = createGraphNode(lessonId, 'Lesson', {
        id: lessonId,
        content: lesson,
        generatedAt: Date.now(),
      });
      await accessLayer.createNode(this.uid, this.graphId, lessonNode);
      this.created.push({ id: lessonId, entity: 'Lesson' });
      await this.createRelationship('hasLesson', id, lessonId);
    }
    return id;
  }

  private async createLesson(fields: Record<string, FieldValue>): Promise<string> {
    const id = `lesson-${generateConceptId()}`;
    const node = createGraphNode(id, 'Lesson', {
      id,
      content: stringField(fields, 'content') ?? '',
      generatedAt: Date.now(),
    });
    await accessLayer.createNode(this.uid, this.graphId, node);
    this.created.push({ id, entity: 'Lesson' });
    return id;
  }

  private async createFlashCard(fields: Record<string, FieldValue>): Promise<string> {
    const id = `flash-${generateConceptId()}`;
    const node = createGraphNode(id, 'FlashCard', {
      id,
      front: stringField(fields, 'front') ?? '',
      back: stringField(fields, 'back') ?? '',
    });
    await accessLayer.createNode(this.uid, this.graphId, node);
    this.created.push({ id, entity: 'FlashCard' });
    return id;
  }

  private async createLearningGoal(fields: Record<string, FieldValue>): Promise<string> {
    const id = generateConceptId();
    const now = Date.now();
    const node = createGraphNode(id, 'LearningGoal', {
      id,
      name: stringField(fields, 'name') ?? 'Imported goal',
      description: stringField(fields, 'description') ?? '',
      type: 'custom',
      createdAt: now,
      updatedAt: now,
    });
    await accessLayer.createNode(this.uid, this.graphId, node);
    this.created.push({ id, entity: 'LearningGoal' });
    // graphOperationParsers: graph → hasLearningGoal → goal.
    await this.createRelationship('hasLearningGoal', this.graphId, id);
    return id;
  }
}

/** New knowledge graph scaffold for an import, mirroring goalController's graph creation. */
export async function createImportGraph(uid: string, name: string): Promise<string> {
  const graphId = generateConceptId();
  const seedConceptId = generateConceptId();
  const now = Date.now();
  const graph: NodeBasedKnowledgeGraph = {
    id: graphId,
    seedConceptId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    name,
    nodes: {
      [graphId]: createGraphNode(graphId, 'Graph', {
        id: graphId,
        seedConceptId,
        createdAt: now,
        updatedAt: now,
      }),
      [seedConceptId]: createGraphNode(seedConceptId, 'Concept', {
        id: seedConceptId,
        name,
        description: `Imported from ${name}`,
        isSeed: true,
      }),
    },
    nodeTypes: {
      ...createEmptyNodeTypeIndex(),
      Graph: [graphId],
      Concept: [seedConceptId],
    },
    relationships: [
      createRelationship(graphId, seedConceptId, 'containsConcept', 'forward'),
      createRelationship(graphId, seedConceptId, 'hasSeedConcept', 'forward'),
    ],
  };
  await accessLayer.saveGraph(uid, graph);
  await invalidateLearningPaths(uid);
  await invalidateJumpBackIn(uid);
  return graphId;
}

// Agentic-path LLM wiring — same provider/model default as services/llm.ts. The handler
// builds its own client from provider/model (kflow's registry @almadar/llm copy and the
// migration package's workspace copy are distinct types, so a pre-built client can't cross).
export const MIGRATION_LLM_PROVIDER = 'deepseek';
export const MIGRATION_LLM_MODEL = 'deepseek-v4-flash';

/** Backs the agent's query_existing tool: reads what's already in the target graph. */
export function createExistingRowsQuerier(uid: string, graphId: string): ExistingRowsQuerier {
  return async (entity, filter): Promise<JsonValue> => {
    const nodeType = IMPORT_ENTITY_NODE_TYPES[entity];
    if (nodeType === undefined) return { error: `entity '${entity}' is not declared in kflow's migration target` };
    const nodes = await accessLayer.getNodesByType(uid, graphId, nodeType);
    const matches = nodes.filter((node) => {
      const properties = propsToRecord(node.properties);
      return Object.entries(filter).every(([key, value]) => properties[key] === value);
    });
    return {
      count: matches.length,
      matches: matches.map((node) => ({ id: node.id, properties: propsToRecord(node.properties) })),
    };
  };
}

// Approval gate for the agentic path: the SSE run parks here until the user decides
// (POST /api/migration/agent/approval) or the stream closes.
interface PendingApproval {
  uid: string;
  resolve: (approved: boolean) => void;
}

const pendingApprovals = new Map<string, PendingApproval>();

export function registerPendingApproval(
  approvalId: string,
  uid: string,
  resolve: (approved: boolean) => void,
): void {
  pendingApprovals.set(approvalId, { uid, resolve });
}

export function cancelPendingApproval(approvalId: string): void {
  const pending = pendingApprovals.get(approvalId);
  if (pending === undefined) return;
  pendingApprovals.delete(approvalId);
  pending.resolve(false);
}

export function resolvePendingApproval(approvalId: string, uid: string, approved: boolean): boolean {
  const pending = pendingApprovals.get(approvalId);
  if (pending === undefined || pending.uid !== uid) return false;
  pendingApprovals.delete(approvalId);
  pending.resolve(approved);
  return true;
}
