import type { Request } from 'express';
import { getFirestore } from '@almadar/server';
import type { JsonValue } from '@almadar/core';
import {
  KnowledgeGraphAccessLayer,
  type GraphAccessDeps,
  type GraphQueryDeps,
  type GraphMutationDeps,
  type GenerateGoalDeps,
  type ExpansionDeps,
  type ExplanationDeps,
  type LayerPracticeDeps,
  type CustomOperationDeps,
  type MutationBatch,
  createMutationContext,
} from '@almadar-io/knowledge/server';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';
import { GraphMutationService } from '@almadar-io/knowledge/server';
import { GraphAuthorizationService } from '../services/graphAuthorizationService';
import {
  parseGenerateGoalsContent,
  parseProgressiveExpandContent,
  parseExplainContent,
  parseAnswerQuestionContent,
  parseGenerateLayerPracticeContent,
  parseCustomOperationContent,
} from './graphOperationParsers';

const accessLayer = new KnowledgeGraphAccessLayer();
const mutationService = new GraphMutationService();
const authorizationService = new GraphAuthorizationService();

function getUid(req: Request): string {
  const uid = req.firebaseUser?.uid;
  if (!uid) throw new Error('Unauthorized');
  return uid;
}

async function getAllGraphIds(uid: string): Promise<string[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs')
    .select('id')
    .get();
  return snapshot.docs.map(doc => doc.id);
}

async function verifyAccess(uid: string, graphId: string, level: 'read' | 'write'): Promise<void> {
  await authorizationService.verifyGraphAccess(uid, graphId, level);
}

async function invalidateCache(uid: string, graphId: string): Promise<void> {
  await accessLayer.clearCache(uid, graphId);
}

export const graphAccessDeps: GraphAccessDeps = {
  accessLayer,
  getUid,
  invalidateCache,
};

export const graphQueryDeps: GraphQueryDeps = {
  accessLayer,
  getUid,
  getAllGraphIds,
};

export const graphMutationDeps: GraphMutationDeps = {
  accessLayer,
  mutationApplier: mutationService,
  getUid,
  invalidateCache,
  verifyAccess,
};

async function parseGoalContent(
  fullContent: string,
  graph: NodeBasedKnowledgeGraph,
  mutationContext: ReturnType<typeof createMutationContext>,
  anchorAnswer: string,
  manualGoal?: Parameters<typeof parseGenerateGoalsContent>[4]
): Promise<{ mutations: MutationBatch; parsedContent: JsonValue; seedConceptId?: string }> {
  const result = await parseGenerateGoalsContent(fullContent, graph, mutationContext, anchorAnswer, manualGoal);
  return {
    mutations: result.mutations,
    parsedContent: JSON.parse(JSON.stringify(result.parsedContent)) as JsonValue,
    seedConceptId: result.seedConceptId,
  };
}

export const generateGoalDeps: GenerateGoalDeps = {
  accessLayer,
  mutationApplier: mutationService,
  getUid,
  verifyAccess,
  parseGoalContent,
};

export const expansionDeps: ExpansionDeps = {
  accessLayer,
  mutationApplier: mutationService,
  getUid,
  verifyAccess,
  parseExpansionContent: parseProgressiveExpandContent,
};

export const explanationDeps: ExplanationDeps = {
  accessLayer,
  mutationApplier: mutationService,
  getUid,
  verifyAccess,
  parseExplainContent,
  parseAnswerQuestionContent: (fullContent: string, storeQA: boolean) =>
    parseAnswerQuestionContent(fullContent, storeQA),
};

export const layerPracticeDeps: LayerPracticeDeps = {
  accessLayer,
  mutationApplier: mutationService,
  getUid,
  verifyAccess,
  parseLayerPracticeContent: parseGenerateLayerPracticeContent,
};

export const customOperationDeps: CustomOperationDeps = {
  accessLayer,
  mutationApplier: mutationService,
  getUid,
  verifyAccess,
  parseCustomOperationContent,
};
