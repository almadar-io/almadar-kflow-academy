import { createLogger } from '@almadar/logger';
import { callLLM, extractJSONArray } from './llm';
import type { JsonValue } from '@almadar/core';
import type { MessageModeration } from '@kflow-academy/shared';

const log = createLogger('kflow:server:moderationService');

const FLAG_THRESHOLD = 0.4;

/**
 * Score one message's relevance to the active grounding badge via a small OpenRouter model.
 * v1 policy = soft flag: the message always sends; this only annotates it. Fails open
 * (unflagged) on any error so infra failure never blocks a message.
 */
export async function scoreRelevance(
  content: string,
  activeBadgeLabel: string | undefined,
): Promise<MessageModeration> {
  if (!activeBadgeLabel) return { score: 1, flagged: false };
  try {
    const resp = await callLLM({
      temperature: 0,
      maxTokens: 80,
      systemPrompt:
        'You moderate a knowledge discussion scoped to one topic. Reply ONLY with compact JSON: ' +
        '{"score":<0.0-1.0>,"reason":<short>}. "score" is how on-topic the message is to the topic. ' +
        'Greeting/social-only/off-topic/spam ⇒ low score.',
      userPrompt: `Topic: ${activeBadgeLabel}\nMessage: ${content}`,
    });
    const arr = extractJSONArray(`[${resp.content.match(/\{[\s\S]*\}/)?.[0] ?? '{}'}]`);
    const obj = (arr[0] ?? {}) as { score?: JsonValue; reason?: JsonValue };
    const score = typeof obj.score === 'number' ? Math.max(0, Math.min(1, obj.score)) : 1;
    const reason = typeof obj.reason === 'string' ? obj.reason : undefined;
    return { score, flagged: score < FLAG_THRESHOLD, reason };
  } catch (e) {
    log.warn('scoreRelevance failed, failing open', { error: e instanceof Error ? e.message : String(e) });
    return { score: 1, flagged: false };
  }
}
