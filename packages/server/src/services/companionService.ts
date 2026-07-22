import type { ServerResponse } from 'http';
import { KnowledgeGraphAccessLayer, runCompanionAnalysis, replyWithCompanion, type KflowAgentConfig } from '@almadar-io/knowledge/server';
import type { RunCompanionOptions } from '@almadar-io/knowledge/server';
import { setupSSE, sendSSEEvent, sendSSEDone } from '@almadar/server';
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

export function analyzeTrajectoryStream(
  res: ServerResponse,
  uid: string,
  skillName?: string,
  locale?: string,
): Promise<void> {
  setupSSE(res);

  const config = buildAgentConfig(uid);
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  const callbacks: Pick<RunCompanionOptions, 'onAssistant' | 'onToolResult' | 'onUsage'> = {
    onAssistant: (_msg, iteration) => {
      sendSSEEvent(res, { type: 'assistant', data: { iteration }, timestamp: Date.now() });
    },
    onToolResult: (toolCall, _result, error) => {
      sendSSEEvent(res, {
        type: 'tool_result',
        data: { tool: toolCall.name, hasError: error !== null },
        timestamp: Date.now(),
      });
    },
    onUsage: (usage) => {
      totalPromptTokens += usage.prompt_tokens ?? 0;
      totalCompletionTokens += usage.completion_tokens ?? 0;
    },
  };

  return runCompanionAnalysis({ config, skillName, locale, ...callbacks })
    .then((result) => {
      log.info('analyzeTrajectoryStream complete', {
        uid,
        suggestionType: result.suggestion.type,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      });
      sendSSEEvent(res, {
        type: 'result',
        data: {
          suggestion: result.suggestion,
          trajectory: result.trajectory,
          cost: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
        },
        timestamp: Date.now(),
      });
    })
    .catch((e) => {
      log.warn('analyzeTrajectoryStream failed', { error: e instanceof Error ? e.message : String(e) });
      sendSSEEvent(res, {
        type: 'error',
        data: { error: e instanceof Error ? e.message : 'Analysis failed' },
        timestamp: Date.now(),
      });
    })
    .finally(() => {
      sendSSEDone(res);
    });
}

export async function replyToUser(uid: string, message: string, locale?: string) {
  log.info('replyToUser', { uid, locale });
  const config = buildAgentConfig(uid);
  const result = await replyWithCompanion({ config, message, locale });
  return result;
}
