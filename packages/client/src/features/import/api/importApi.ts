import { apiClient } from '../../../services/apiClient';
import { auth } from '../../../config/firebase';
import type { JsonValue } from '@almadar-io/knowledge';
import type {
  MigrationPreviewRequest,
  MigrationPreviewResponse,
  MigrationImportRequest,
  MigrationImportResponse,
  MigrationAgentRequest,
  MigrationAgentResponse,
  MigrationApprovalRequest,
  MigrationApprovalResponse,
  MigrationStepEvent,
  CommitResult,
} from '@kflow-academy/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function previewImport(
  body: MigrationPreviewRequest,
): Promise<MigrationPreviewResponse> {
  return (await apiClient.fetch(`/api/migration/preview`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })) as MigrationPreviewResponse;
}

export async function runImport(
  body: MigrationImportRequest,
): Promise<MigrationImportResponse> {
  return (await apiClient.fetch(`/api/migration/import`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })) as MigrationImportResponse;
}

export async function approveAgentImport(
  body: MigrationApprovalRequest,
): Promise<MigrationApprovalResponse> {
  return (await apiClient.fetch(`/api/migration/agent/approval`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })) as MigrationApprovalResponse;
}

export interface AgentImportCallbacks {
  onStep?: (event: MigrationStepEvent) => void;
  onDone?: (result: MigrationAgentResponse) => void;
  onError?: (error: string) => void;
}

function isRecord(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCommit(value: JsonValue | undefined): CommitResult | null {
  if (value === null || value === undefined || !isRecord(value)) return null;
  const failed: { ref: string; reason: string }[] = [];
  const failedRaw = value['failed'];
  if (Array.isArray(failedRaw)) {
    for (const item of failedRaw) {
      if (isRecord(item) && typeof item['ref'] === 'string' && typeof item['reason'] === 'string') {
        failed.push({ ref: item['ref'], reason: item['reason'] });
      }
    }
  }
  const committed = value['committed'];
  return { committed: typeof committed === 'number' ? committed : 0, failed };
}

function parseStepEvent(value: JsonValue | undefined): MigrationStepEvent | null {
  if (!isRecord(value) || typeof value['type'] !== 'string') return null;
  return value as MigrationStepEvent;
}

function parseAgentResponse(value: JsonValue | undefined): MigrationAgentResponse | null {
  if (!isRecord(value)) return null;
  const graphId = value['graphId'];
  if (typeof graphId !== 'string') return null;
  const completed = value['completed'];
  const reason = value['reason'];
  return {
    completed: completed === true,
    reason: typeof reason === 'string' ? reason : '',
    commit: parseCommit(value['commit']),
    graphId,
  };
}

/** Agentic import over SSE: step events stream back; the run parks at the approval gate. */
export async function streamAgentImport(
  request: MigrationAgentRequest,
  callbacks: AgentImportCallbacks,
): Promise<MigrationAgentResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}/api/migration/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((error as { error?: string }).error || 'Request failed');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: MigrationAgentResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();

        try {
          const event = JSON.parse(raw) as { type: string; data?: JsonValue };

          if (event.type === 'error') {
            const message = isRecord(event.data) && typeof event.data['error'] === 'string'
              ? event.data['error']
              : 'Stream error';
            callbacks.onError?.(message);
            throw new Error(message);
          }

          if (event.type === 'complete') {
            finalResult = parseAgentResponse(event.data);
            if (finalResult !== null) callbacks.onDone?.(finalResult);
            continue;
          }

          if (event.type === 'step') {
            const step = parseStepEvent(event.data);
            if (step !== null) callbacks.onStep?.(step);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            callbacks.onError?.(e.message);
            throw e;
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }

  if (!finalResult) throw new Error('Stream completed without final result');
  return finalResult;
}
