import {
  LLMClient,
  type LLMProvider as AlmadarLLMProvider,
  type LLMStreamChunk,
  type LLMCallOptions,
} from '@almadar/llm';

export type LLMProvider = 'openai' | 'gemini' | 'deepseek' | 'openrouter';

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

export interface LLMJsonRequest<T> extends LLMRequest {
  /** Zod schema — when present, wrong-shaped (valid-JSON) replies also retry. */
  schema?: LLMCallOptions<T>['schema'];
  maxRetries?: number;
}

/**
 * JSON-producing LLM call via the upstream @almadar/llm path: shared
 * json-parser (fence stripping, common-issue repair, optional schema
 * validation) plus up to maxRetries (default 2) retries with the
 * parse/validation error fed back as context. Do NOT reintroduce local
 * regex extractors at call sites — this is the one JSON path.
 */
export async function callLLMJson<T>(request: LLMJsonRequest<T>): Promise<T> {
  const kflowProvider = request.provider ?? 'deepseek';
  const client = new LLMClient({
    provider: toAlmadarProvider(kflowProvider),
    model: request.model ?? defaultModelFor(kflowProvider),
    temperature: request.temperature,
    streaming: false,
  });
  try {
    return await client.call<T>({
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      schema: request.schema,
      maxRetries: request.maxRetries,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      skipSchemaValidation: !request.schema,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`LLM API call failed: ${msg}`);
  }
}


// Gemini is not supported by @almadar/llm; callers that previously picked
// gemini fall back to deepseek (the KFlow default). openrouter remains for the
// bge embedding client only (OPEN_ROUTER_API_KEY); all peer-connection text LLM
// (concept-chat personas/replies, badge sub-topics, relevance moderation) uses
// the deepseek default (deepseek-v4-flash).
function toAlmadarProvider(provider: LLMProvider): AlmadarLLMProvider {
  if (provider === 'openai') return 'openai';
  if (provider === 'openrouter') return 'openrouter';
  return 'deepseek';
}

function defaultModelFor(provider: LLMProvider): string {
  if (provider === 'openai') return 'gpt-5-nano';
  if (provider === 'openrouter') return 'qwen/qwen-2.5-7b-instruct';
  return 'deepseek-v4-flash';
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
