import type { JsonValue } from '@almadar/core';
import {
  LLMClient,
  type LLMProvider as AlmadarLLMProvider,
  type LLMStreamChunk,
} from '@almadar/llm';

export type LLMProvider = 'openai' | 'gemini' | 'deepseek';

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

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const kflowProvider = request.provider ?? 'deepseek';
  const almadarProvider = toAlmadarProvider(kflowProvider);
  const actualModel = request.model ?? defaultModelFor(kflowProvider);
  const { systemPrompt, userPrompt } = request;

  const client = new LLMClient({
    provider: almadarProvider,
    model: actualModel,
    temperature: request.temperature,
    // Must be set for streamRaw's LangChain .stream() to emit token deltas — without it the
    // model is built non-streaming and .stream() yields the whole response as a single chunk.
    streaming: request.stream ?? false,
  });

  try {
    if (request.stream) {
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
        raw: rawStream,
        model: actualModel,
        stream: true,
      };
      return streamResponse;
    }

    const raw = await client.callRaw({ systemPrompt, userPrompt, maxTokens: request.maxTokens });
    const textResponse: LLMResponseText = { content: raw, raw, model: actualModel };
    return textResponse;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`LLM API call failed: ${msg}`);
  }
}
