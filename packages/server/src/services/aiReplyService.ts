import { createLogger } from '@almadar/logger';
import { callLLM, AI_LLM } from './llm';
import { getAiUser } from './aiUserService';
import { graphAccessDeps } from '../utils/graphHandlerDeps';

const log = createLogger('kflow:server:aiReplyService');

/**
 * Generate an AI peer's reply, grounded in the active badge + the AI user's own domain
 * (persona + canonical concept set). The reply is knowledge-centered and stays on the
 * active topic; it then goes through the same moderator as a human message.
 */
export async function generateAiReply(
  aiUid: string,
  activeBadgeLabel: string | undefined,
  humanMessage: string,
): Promise<string | null> {
  const ai = await getAiUser(aiUid);
  if (!ai) {
    log.warn('generateAiReply: no AI user record', { aiUid });
    return null;
  }
  const set = await graphAccessDeps.accessLayer.getVectorService().getCanonicalConceptsByOwner(aiUid);
  const domain = set.canonicalNames.slice(0, 12).join(', ');

  try {
    const resp = await callLLM({
      provider: AI_LLM.provider,
      model: AI_LLM.replyModel,
      temperature: 0.6,
      maxTokens: 220,
      systemPrompt:
        `You are ${ai.persona}, acting as an anonymous peer in a 1:1 knowledge discussion ` +
        `(domain: ${ai.area} / ${ai.subdomain}; concepts you know: ${domain}). ` +
        'Reply concisely and helpfully, grounded in the active topic. ' +
        'Stay strictly on-topic — no greetings, no personal questions, no off-topic chat. ' +
        'Share a useful insight, a clarifying question, or an analogy. Keep it under 60 words.',
      userPrompt: `Active topic: ${activeBadgeLabel ?? ai.subdomain}\nThe other learner wrote: ${humanMessage}`,
    });
    return resp.content.trim() || null;
  } catch (e) {
    log.warn('generateAiReply failed', { aiUid, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}
