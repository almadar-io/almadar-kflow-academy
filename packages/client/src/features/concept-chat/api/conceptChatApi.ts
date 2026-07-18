import { apiClient } from '../../../services/apiClient';
import type {
  StartConceptChatRequest,
  StartConceptChatResponse,
  SendConceptChatRequest,
  SendConceptChatResponse,
} from '@kflow-academy/shared';

export async function startConceptChat(
  body: StartConceptChatRequest,
): Promise<StartConceptChatResponse> {
  return (await apiClient.fetch(`/api/concept-chat/start`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })) as StartConceptChatResponse;
}

export async function sendConceptChatMessage(
  body: SendConceptChatRequest,
): Promise<SendConceptChatResponse> {
  return (await apiClient.fetch(`/api/concept-chat/message`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })) as SendConceptChatResponse;
}
