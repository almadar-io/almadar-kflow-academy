import { apiClient } from '../../../services/apiClient';
import type { CompanionAnalyzeResponse, CompanionReplyResponse } from '@kflow-academy/shared';
import type { Suggestion, TrajectorySummary } from '@kflow-academy/shared';

export interface CompanionStreamEvent {
  type: 'assistant' | 'tool_result' | 'result' | 'error' | 'done';
  data?: CompanionStreamEventData;
  timestamp?: number;
}

export interface CompanionStreamEventData {
  iteration?: number;
  tool?: string;
  hasError?: boolean;
  suggestion?: Suggestion;
  trajectory?: TrajectorySummary;
  cost?: { promptTokens: number; completionTokens: number };
  error?: string;
}

export async function analyzeTrajectory(skill?: string, locale?: string): Promise<CompanionAnalyzeResponse> {
  return apiClient.fetch('/api/companion/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skill, locale }),
  });
}

export async function replyToCompanion(message: string, locale?: string): Promise<CompanionReplyResponse> {
  return apiClient.fetch('/api/companion/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, locale }),
  });
}

export async function streamCompanionAnalysis(
  locale: string | undefined,
  onEvent: (event: CompanionStreamEvent) => void,
): Promise<void> {
  const baseURL = apiClient.baseURL;
  const params = new URLSearchParams();
  if (locale) params.set('locale', locale);
  const url = `${baseURL}/api/companion/analyze-stream${params.size > 0 ? `?${params}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'text/event-stream' },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const chunk of events) {
      const dataLine = chunk.trim();
      if (dataLine.startsWith('data: ')) {
        try {
          const event = JSON.parse(dataLine.slice(6)) as CompanionStreamEvent;
          onEvent(event);
        } catch {
          // Partial JSON — skip
        }
      }
    }
  }
}
