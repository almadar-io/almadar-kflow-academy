import { encoding_for_model, get_encoding, type Tiktoken } from 'tiktoken';
import { addCostToDailyTracking } from '../services/costService';
import { getGemini } from '../config/gemini';

/**
 * Model pricing structure
 */
type ModelPricing = {
  input: number;
  output: number;
};

/**
 * Provider pricing structure
 */
type ProviderPricing = {
  [model: string]: ModelPricing;
};

/**
 * Token pricing constants (per 1M tokens)
 * Update these values as needed
 */
export const TOKEN_PRICING: {
  openai: ProviderPricing;
  gemini: ProviderPricing;
  deepseek: ProviderPricing;
} = {
  //https://openai.com/api/pricing/
  openai: {
    'gpt-5-nano': {
      input: 0.050, // $2.50 per 1M input tokens
      output: 0.40, // $10.00 per 1M output tokens
    },
    'gpt-5-mini': {
      input: .250, // $.250 per 1M input tokens
      output: 2.0, // $2.00 per 1M output tokens
    },
    'gpt-5': {
      input: 1.250, // 1.250 per 1M input tokens
      output: 10.0, // $10.00 per 1M output tokens
    },
  },
  //https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-lite
  gemini: {
    'gemini-2.5-flash': {
      input: 0.30, // $0.30 per 1M input tokens
      output: 2.5, // $2.5 per 1M output tokens
    },
    'gemini-2.5-flash-lite': {
      input: 0.10, // $0.10 per 1M input tokens
      output: 0.40, // $0.40 per 1M output tokens
    },
    'gemini-2.5-pro': {
        //depends on the input count
        input: 0.0,
        output: 0.0
    },
  },
  //https://api-docs.deepseek.com/quick_start/pricing
  deepseek: {
    'deepseek-chat': {
      input: 0.28, // $0.280 per 1M input tokens
      output: 0.42, // $0.42 per 1M output tokens
    },
    'deepseek-reasoner': {
      input: 0.28, // $0.14 per 1M input tokens
      output: 0.42, // $0.56 per 1M output tokens
    },
  },
} as const;

export interface TokenCountResult {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Counts tokens for OpenAI/Deepseek models using tiktoken
 */
export async function countTokensTiktoken(
  text: string,
  model: string
): Promise<number> {
  try {
    // Try to get encoding for the specific model
    let encoding: Tiktoken;
    try {
      encoding = encoding_for_model(model as any);
    } catch {
      // Fallback to cl100k_base (used by GPT-4, GPT-3.5, and many models)
      encoding = get_encoding('cl100k_base');
    }
    
    const tokens = encoding.encode(text);
    encoding.free(); // Free the encoding to prevent memory leaks
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens with tiktoken:', error);
    // Fallback: rough estimate (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Counts tokens for Gemini using the CountTokens API
 */
export async function countTokensGemini(
  text: string,
  model: string = 'gemini-2.5-flash'
): Promise<number> {
  try {
    const gemini = getGemini();
    if (!gemini) {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables.');
    }
    
    // Use countTokens method from models
    const response = await gemini.models.countTokens({
      model,
      contents: text,
    });
    return response.totalTokens ?? 0;
  } catch (error) {
    console.error('Error counting tokens with Gemini API:', error);
    // Fallback: rough estimate (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Calculates token counts and pricing for a provider
 */
export async function calculateTokenPricing(
  provider: 'openai' | 'gemini' | 'deepseek',
  systemPrompt: string,
  userPrompt: string,
  outputText: string,
  model: string,
  uid?: string
): Promise<TokenCountResult> {
  let inputTokens: number;
  let outputTokens: number;

  if (provider === 'gemini') {
    // For Gemini, combine system and user prompts
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    inputTokens = await countTokensGemini(combinedPrompt, model);
    outputTokens = await countTokensGemini(outputText, model);
  } else {
    // For OpenAI and Deepseek, use tiktoken
    // Count system and user prompts separately, then combine
    const systemTokens = await countTokensTiktoken(systemPrompt, model);
    const userTokens = await countTokensTiktoken(userPrompt, model);
    inputTokens = systemTokens + userTokens;
    outputTokens = await countTokensTiktoken(outputText, model);
  }

  const providerPricing = TOKEN_PRICING[provider];
  const modelPricing: ModelPricing | undefined = providerPricing[model];
  
  if (!modelPricing) {
    console.warn(`No pricing found for model ${model} in provider ${provider}, using fallback pricing`);
    // Fallback to first available model pricing or default
    const firstModel = Object.values(providerPricing)[0];
    if (!firstModel) {
      throw new Error(`No pricing configuration found for provider ${provider}`);
    }
    const pricing = firstModel as ModelPricing;
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    // Track costs in Firestore (fire and forget - don't await to avoid blocking)
    if (uid) {
      addCostToDailyTracking(uid, provider, model, inputTokens, outputTokens, inputCost, outputCost).catch(
        (error) => {
          console.error('Failed to track cost in Firestore:', error);
        }
      );
    }

    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
    };
  }

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
  const totalCost = inputCost + outputCost;

  // Track costs in Firestore (fire and forget - don't await to avoid blocking)
  if (uid) {
    addCostToDailyTracking(uid, provider, model, inputTokens, outputTokens, inputCost, outputCost).catch(
      (error) => {
        console.error('Failed to track cost in Firestore:', error);
      }
    );
  }

  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
  };
}

/**
 * Logs token usage and pricing information
 */
export function logTokenUsage(
  provider: 'openai' | 'gemini' | 'deepseek',
  model: string,
  result: TokenCountResult
): void {
  console.log('\n=== Token Usage & Pricing ===');
  console.log(`Provider: ${provider.toUpperCase()}`);
  console.log(`Model: ${model}`);
  console.log(`Input Tokens: ${result.inputTokens.toLocaleString()}`);
  console.log(`Input Cost: $${result.inputCost.toFixed(6)}`);
  console.log(`Output Tokens: ${result.outputTokens.toLocaleString()}`);
  console.log(`Output Cost: $${result.outputCost.toFixed(6)}`);
  console.log(`Total Cost: $${result.totalCost.toFixed(6)}`);
  console.log('============================\n');
}

