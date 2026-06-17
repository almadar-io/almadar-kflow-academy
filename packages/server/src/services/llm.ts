import type { JsonValue } from '@almadar/core';
import {
  LLMClient,
  type LLMProvider as AlmadarLLMProvider,
  type LLMStreamChunk,
} from '@almadar/llm';
import { calculateTokenPricing, logTokenUsage, TokenCountResult } from '../utils/tokenPricing';

export type LLMProvider = 'openai' | 'gemini' | 'deepseek';

export interface CostTrackingMetadata {
  systemPrompt: string;
  userPrompt: string;
  provider: LLMProvider;
  model: string;
  uid?: string;
}

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  uid?: string;
  stream?: boolean;
}

export interface LLMResponseBase {
  content: string;
  model: string;
  costTrackingMetadata?: CostTrackingMetadata;
}

export interface LLMResponseText extends LLMResponseBase {
  stream?: false;
  raw: string;
}

export interface LLMResponseStream extends LLMResponseBase {
  stream: true;
  raw: AsyncGenerator<LLMStreamChunk>;
}

export type LLMResponse = LLMResponseText | LLMResponseStream;

export async function trackLLMCost(
  metadata: CostTrackingMetadata,
  outputContent: string
): Promise<TokenCountResult | null> {
  if (!metadata.uid) {
    console.warn('[LLM Service] Skipping cost tracking - UID is missing');
    return null;
  }

  try {
    const tokenResult = await calculateTokenPricing(
      metadata.provider,
      metadata.systemPrompt,
      metadata.userPrompt,
      outputContent,
      metadata.model,
      metadata.uid
    );
    logTokenUsage(metadata.provider, metadata.model, tokenResult);
    return tokenResult;
  } catch (error) {
    console.error('[LLM Service] Error tracking costs:', error);
    return null;
  }
}

export function extractJSONArray(response: string): JsonValue[] {
  const jsonBlockMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]) as JsonValue[];
    } catch {
      // fall through
    }
  }

  const arrayMatch = response.match(/(\[[\s\S]*\])/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[1]) as JsonValue[];
    } catch {
      // fall through
    }
  }

  try {
    const parsed = JSON.parse(response) as JsonValue;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }

  const objectMatches = response.match(/\{[^{}]*\}/g);
  if (objectMatches && objectMatches.length > 0) {
    try {
      return objectMatches.map(match => JSON.parse(match) as JsonValue);
    } catch {
      // fall through
    }
  }

  throw new Error('Could not extract JSON array from LLM response');
}

// Gemini is not supported by @almadar/llm; callers that previously picked
// gemini fall back to deepseek (the KFlow default).
function toAlmadarProvider(provider: LLMProvider): AlmadarLLMProvider {
  if (provider === 'openai') return 'openai';
  return 'deepseek';
}

function defaultModelFor(provider: LLMProvider): string {
  if (provider === 'openai') return 'gpt-5-nano';
  return 'deepseek-chat';
}

function resolvedKflowProvider(provider: LLMProvider): LLMProvider {
  return provider === 'gemini' ? 'deepseek' : provider;
}

async function* adaptStreamChunks(
  gen: AsyncGenerator<LLMStreamChunk>,
  metadata: CostTrackingMetadata
): AsyncGenerator<LLMStreamChunk> {
  let fullContent = '';
  try {
    for await (const chunk of gen) {
      if (chunk.content) fullContent += chunk.content;
      yield chunk;
    }
  } finally {
    if (metadata.uid && fullContent) {
      trackLLMCost(metadata, fullContent).catch((err: unknown) => {
        console.error('[LLM Service] Stream cost tracking error:', err);
      });
    }
  }
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const kflowProvider = request.provider ?? 'deepseek';
  const almadarProvider = toAlmadarProvider(kflowProvider);
  const actualModel = request.model ?? defaultModelFor(kflowProvider);
  const { systemPrompt, userPrompt } = request;

  const client = new LLMClient({
    provider: almadarProvider,
    model: actualModel,
    temperature: request.temperature,
  });

  try {
    if (request.stream) {
      const costMeta: CostTrackingMetadata = {
        systemPrompt,
        userPrompt,
        provider: resolvedKflowProvider(kflowProvider),
        model: actualModel,
        uid: request.uid,
      };

      const rawStream = client.streamRaw({
        systemPrompt,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });

      const streamResponse: LLMResponseStream = {
        content: '',
        raw: adaptStreamChunks(rawStream, costMeta),
        model: actualModel,
        stream: true,
        costTrackingMetadata: costMeta,
      };
      return streamResponse;
    }

    const raw = await client.callRaw({ systemPrompt, userPrompt, maxTokens: request.maxTokens });

    if (request.uid) {
      await trackLLMCost(
        {
          systemPrompt,
          userPrompt,
          provider: resolvedKflowProvider(kflowProvider),
          model: actualModel,
          uid: request.uid,
        },
        raw
      );
    }

    const textResponse: LLMResponseText = { content: raw, raw, model: actualModel };
    return textResponse;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`LLM API call failed: ${msg}`);
  }
}
