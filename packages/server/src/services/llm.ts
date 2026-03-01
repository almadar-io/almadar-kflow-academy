import { getOpenAI } from '../config/openai';
import { getGemini } from '../config/gemini';
import { getDeepseek } from '../config/deepseek';
import { getLLMProvider } from '../config/llmConfig';
import { calculateTokenPricing, logTokenUsage, TokenCountResult } from '../utils/tokenPricing';

export interface CostTrackingMetadata {
  systemPrompt: string;
  userPrompt: string;
  provider: 'openai' | 'gemini' | 'deepseek';
  model: string;
  uid?: string;
}

export type LLMProvider = 'openai' | 'gemini' | 'deepseek';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  uid?: string; // User ID for cost tracking
  stream?: boolean; // Whether to stream the response
}

export interface LLMResponse {
  content: string;
  raw: any;
  model: string;  // The model that was actually used
  stream?: boolean; // Whether this is a streaming response
  // Metadata for cost tracking (only present when streaming)
  costTrackingMetadata?: {
    systemPrompt: string;
    userPrompt: string;
    provider: LLMProvider;
    model: string;
    uid?: string;
  };
}

/**
 * Extracts JSON array from LLM response
 * Handles cases where LLM wraps JSON in markdown or text
 */
/**
 * Centralized cost tracking function - can be called from both streaming and non-streaming flows
 * This ensures all cost tracking logic is in one place (llm.ts)
 */
export async function trackLLMCost(
  metadata: CostTrackingMetadata,
  outputContent: string
): Promise<TokenCountResult | null> {
  if (!metadata.uid) {
    console.warn('[LLM Service] Skipping cost tracking - UID is missing');
    return null;
  }

  try {
    console.log(`[LLM Service] Tracking costs - Provider: ${metadata.provider}, Model: ${metadata.model}, UID: ${metadata.uid}`);
    const tokenResult = await calculateTokenPricing(
      metadata.provider,
      metadata.systemPrompt,
      metadata.userPrompt,
      outputContent,
      metadata.model,
      metadata.uid
    );
    logTokenUsage(metadata.provider, metadata.model, tokenResult);
    console.log(`[LLM Service] Successfully tracked costs - Total: $${tokenResult.totalCost.toFixed(6)}`);
    return tokenResult;
  } catch (error) {
    console.error('[LLM Service] Error tracking costs:', error);
    if (error instanceof Error) {
      console.error('[LLM Service] Error details:', error.message, error.stack);
    }
    return null;
  }
}

/**
 * Wraps a stream to track costs on completion (even if interrupted)
 * Consumes the stream internally, accumulates content, and tracks costs when done
 * Returns a new async iterable that passes through chunks in real-time
 */
async function* wrapStreamWithCostTracking(
  stream: AsyncIterable<any>,
  metadata: CostTrackingMetadata
): AsyncGenerator<any, void, unknown> {
  let fullContent = '';
  let streamError: Error | null = null;

  try {
    for await (const chunk of stream) {
      // Extract content from chunk
      const content = chunk.choices?.[0]?.delta?.content || chunk.content || '';
      
      if (content) {
        fullContent += content;
      }
      
      // Yield chunk immediately for real-time streaming
      yield chunk;
    }
    
  } catch (error) {
    streamError = error instanceof Error ? error : new Error('Unknown stream error');
    // Still yield the error, but we'll track costs for what we got
    throw streamError;
  } finally {
    // Track costs when stream ends (even if interrupted or errored)
    // This happens asynchronously and doesn't block the stream
    if (metadata.uid && fullContent) {
      // Fire and forget - don't await to avoid blocking
      trackLLMCost(metadata, fullContent).catch((costError) => {
        console.error('[LLM Service] Error tracking costs for stream (non-blocking):', costError);
      });
    } else if (metadata.uid && !fullContent) {
      console.warn('[LLM Service] Stream completed but no content accumulated for cost tracking');
    }
  }
}

export function extractJSONArray(response: string): any[] {
  // Try to find JSON array in the response
  // Handle markdown code blocks
  const jsonBlockMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch (e) {
      // Continue to try other methods
    }
  }

  // Try to find JSON array directly
  const arrayMatch = response.match(/(\[[\s\S]*\])/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[1]);
    } catch (e) {
      // Continue to try other methods
    }
  }

  // Try to parse the entire response as JSON
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Not valid JSON
  }

  // Fallback: try to extract individual objects and combine into array
  const objectMatches = response.match(/\{[^{}]*\}/g);
  if (objectMatches && objectMatches.length > 0) {
    try {
      return objectMatches.map(match => JSON.parse(match));
    } catch (e) {
      // Failed to parse objects
    }
  }

  throw new Error('Could not extract JSON array from LLM response');
}

/**
 * Calls LLM API with structured prompt
 * Handles JSON extraction and validation
 * Supports both OpenAI and Gemini providers
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  // Use provider from request, or fall back to global config, or default to 'openai'
  const provider = request.provider || getLLMProvider() || 'deepseek';
  console.log('provider', provider);
  const {
    systemPrompt,
    userPrompt,
    model,
    //temperature = 0.7,
    //maxTokens = 2000,
  } = request;
  try {
    if (provider === 'openai') {
      const openai = getOpenAI();
      if (!openai) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }

      const actualModel = model || 'gpt-5-nano';
      console.log('model', actualModel);
      const completion = await openai.chat.completions.create({
        model: actualModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        //temperature,
        //max_tokens: maxTokens,
        // Note: response_format can only be used for json_object, not arrays
        // We'll extract JSON arrays manually from the response
      });

      const content = completion.choices[0]?.message?.content || '';
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Track costs using centralized function
      if (request.uid) {
        await trackLLMCost(
          {
            systemPrompt,
            userPrompt,
            provider: 'openai',
            model: actualModel,
            uid: request.uid,
          },
          content
        );
      }

      return {
        content,
        raw: completion,
        model: actualModel,
      };
    } else if (provider === 'gemini') {
      const gemini = getGemini();
      if (!gemini) {
        throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables.');
      }

      // Gemini combines system and user prompts differently
      // We'll combine them in the prompt text
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const actualModel = model || 'gemini-2.5-flash-lite';
      console.log('model', actualModel);
      
      const result = await gemini.models.generateContent({
        model: actualModel,
        contents: combinedPrompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
      const content = result.text;

      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Track costs using centralized function
      if (request.uid) {
        await trackLLMCost(
          {
            systemPrompt,
            userPrompt,
            provider: 'gemini',
            model: actualModel,
            uid: request.uid,
          },
          content
        );
      }

      return {
        content,
        raw: result,
        model: actualModel,
      };
    } else if (provider === 'deepseek') {
      const deepseek = getDeepseek();
      if (!deepseek) {
        throw new Error(
          'Deepseek API key not configured. Please set DEEPSEEK_API_KEY in your environment variables.',
        );
      }

      const actualModel = model || 'deepseek-chat';
      console.log('model', actualModel);
      
      // If streaming is requested, return a stream with cost tracking
      if (request.stream) {
        const originalStream = await deepseek.chat.completions.create({
          model: actualModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true,
        });

        // Create cost tracking metadata
        const costTrackingMetadata: CostTrackingMetadata = {
          systemPrompt: request.systemPrompt,
          userPrompt: request.userPrompt,
          provider: 'deepseek',
          model: actualModel,
          uid: request.uid,
        };
        
        // Wrap the stream to track costs on completion (even if interrupted)
        const wrappedStream = wrapStreamWithCostTracking(originalStream, costTrackingMetadata);
        
        return {
          content: '',
          raw: wrappedStream,
          model: actualModel,
          stream: true,
        } as LLMResponse & { stream: true };
      }

      const completion = await deepseek.chat.completions.create({
        model: actualModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: request.temperature,
        max_tokens: request.maxTokens
      });

      const content = completion.choices[0]?.message?.content || '';
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Track costs using centralized function
      if (request.uid) {
        await trackLLMCost(
          {
            systemPrompt,
            userPrompt,
            provider: 'deepseek',
            model: actualModel,
            uid: request.uid,
          },
          content
        );
      }

      return {
        content,
        raw: completion,
        model: completion.model ?? actualModel,
      };
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`LLM API call failed: ${errorMessage}`);
  }
}

