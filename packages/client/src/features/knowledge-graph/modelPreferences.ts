/**
 * Model preferences for graph operations.
 * Stored in localStorage; read by operation hooks to select which LLM
 * handles expand vs explain independently.
 */

export interface ModelOption {
  key: string;
  provider: 'deepseek' | 'openrouter';
  model: string;
  label: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { key: 'qwen3-30b-a3b', provider: 'openrouter', model: 'qwen/qwen3-30b-a3b-instruct-2507', label: 'Qwen3 30B A3B — Fast & cheap ($0.05/M)' },
  { key: 'deepseek-v4-flash', provider: 'deepseek', model: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash — Baseline ($0.14/M)' },
];

const DEFAULT_EXPAND_KEY = 'qwen3-30b-a3b';
const DEFAULT_EXPLAIN_KEY = 'deepseek-v4-flash';
const STORAGE_KEY_EXPAND = 'kflow-model-expand';
const STORAGE_KEY_EXPLAIN = 'kflow-model-explain';

export function getExpandModel(): ModelOption {
  const key = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_EXPAND) : null;
  return MODEL_OPTIONS.find(m => m.key === key) ?? MODEL_OPTIONS.find(m => m.key === DEFAULT_EXPAND_KEY)!;
}

export function getExplainModel(): ModelOption {
  const key = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_EXPLAIN) : null;
  return MODEL_OPTIONS.find(m => m.key === key) ?? MODEL_OPTIONS.find(m => m.key === DEFAULT_EXPLAIN_KEY)!;
}

export function setExpandModel(key: string): void {
  localStorage.setItem(STORAGE_KEY_EXPAND, key);
}

export function setExplainModel(key: string): void {
  localStorage.setItem(STORAGE_KEY_EXPLAIN, key);
}

export function toRequestParams(option: ModelOption): { provider: string; model: string } {
  return { provider: option.provider, model: option.model };
}
