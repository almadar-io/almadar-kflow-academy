import { LLMProvider } from '../services/llm';

// Global LLM provider configuration
// Can be set by the demo or other scripts
let currentProvider: LLMProvider;

/**
 * Get the current LLM provider
 */
export function getLLMProvider(): LLMProvider {
  return currentProvider;
}

/**
 * Set the current LLM provider
 */
export function setLLMProvider(provider: LLMProvider): void {
  currentProvider = provider;
}

