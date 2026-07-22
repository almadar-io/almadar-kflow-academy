import { KnowledgeGraphAccessLayer, runCompanionAnalysis, replyWithCompanion, type KflowAgentConfig } from '@almadar-io/knowledge/server';
import { createLogger } from '@almadar/logger';
import { listUserGraphIds } from '../utils/listUserGraphIds';

const log = createLogger('kflow:server:services:companionService');

const accessLayer = new KnowledgeGraphAccessLayer();

export function buildAgentConfig(uid: string): KflowAgentConfig {
  return {
    accessLayer,
    uid,
    listGraphIds: () => listUserGraphIds(uid),
  };
}

export async function analyzeTrajectory(uid: string, skillName?: string, locale?: string) {
  log.info('analyzeTrajectory', { uid, skillName, locale });
  const config = buildAgentConfig(uid);
  const result = await runCompanionAnalysis({ config, skillName, locale });
  log.info('analyzeTrajectory complete', {
    uid,
    suggestionType: result.suggestion.type,
    suggestionTitle: result.suggestion.title,
    totalPaths: result.trajectory.totalPaths,
  });
  return result;
}

export async function replyToUser(uid: string, message: string, locale?: string) {
  log.info('replyToUser', { uid, locale });
  const config = buildAgentConfig(uid);
  const result = await replyWithCompanion({ config, message, locale });
  return result;
}
