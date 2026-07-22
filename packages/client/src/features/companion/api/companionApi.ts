import { apiClient } from '../../../services/apiClient';
import type { CompanionAnalyzeResponse, CompanionReplyResponse } from '@kflow-academy/shared';

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
