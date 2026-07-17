import { apiClient } from '../../../services/apiClient';
import type {
  PeerDTO,
  ConnectionDTO,
  NodeKey,
  CreateConnectionRequest,
  SendMessageRequest,
} from '@kflow-academy/shared';

// All endpoints are auth-gated server-side; apiClient.fetch injects the Firebase bearer.

export async function fetchNodePeers(nodeKey: NodeKey): Promise<PeerDTO[]> {
  const data = await apiClient.fetch(`/api/peers?nodeKey=${encodeURIComponent(nodeKey)}`);
  return (data?.peers ?? []) as PeerDTO[];
}

export async function touchNodeActivity(nodeKey: NodeKey): Promise<void> {
  await apiClient.fetch(`/api/node-activity/${encodeURIComponent(nodeKey)}`, { method: 'POST' });
}

export async function createConnection(
  body: CreateConnectionRequest,
): Promise<{ id: string }> {
  return (await apiClient.fetch(`/api/connections`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })) as { id: string };
}

export async function fetchConnection(id: string): Promise<ConnectionDTO> {
  return (await apiClient.fetch(`/api/connections/${encodeURIComponent(id)}`)) as ConnectionDTO;
}

export async function setActiveBadge(id: string, badgeId: string): Promise<void> {
  await apiClient.fetch(`/api/connections/${encodeURIComponent(id)}/active-badge`, {
    method: 'PATCH',
    body: JSON.stringify({ badgeId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function sendMessage(
  id: string,
  body: SendMessageRequest,
): Promise<{ messageId: string }> {
  return (await apiClient.fetch(`/api/connections/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })) as { messageId: string };
}
