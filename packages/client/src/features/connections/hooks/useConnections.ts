import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNodePeers,
  touchNodeActivity,
  createConnection,
  fetchConnection,
  sendMessage,
  setActiveBadge,
} from '../api/connectionsApi';
import type { NodeKey, SendMessageRequest } from '@kflow-academy/shared';

export const connectionsKeys = {
  all: ['connections'] as const,
  nodePeers: (nodeKey: string) => [...connectionsKeys.all, 'peers', nodeKey] as const,
  connection: (id: string) => [...connectionsKeys.all, 'connection', id] as const,
};

/** Anonymous peers recently active on a node, ranked by convergence. */
export function useNodePeers(nodeKey: NodeKey | null) {
  return useQuery({
    queryKey: connectionsKeys.nodePeers(nodeKey ?? ''),
    queryFn: () => fetchNodePeers(nodeKey as NodeKey),
    enabled: !!nodeKey,
    staleTime: 30_000,
  });
}

/** Single idempotent presence touch on node-view mount (recency, not a heartbeat). */
export function useTouchNodeActivity(nodeKey: NodeKey | null): void {
  useEffect(() => {
    if (!nodeKey) return;
    void touchNodeActivity(nodeKey).catch(() => {});
  }, [nodeKey]);
}

export function useCreateConnection() {
  return useMutation({ mutationFn: createConnection });
}

/** Connection thread + badges; polls for async replies. */
export function useConnection(id: string) {
  return useQuery({
    queryKey: connectionsKeys.connection(id),
    queryFn: () => fetchConnection(id),
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

export function useSendMessage(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageRequest) => sendMessage(connectionId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionsKeys.connection(connectionId) }),
  });
}

export function useSetActiveBadge(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (badgeId: string) => setActiveBadge(connectionId, badgeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionsKeys.connection(connectionId) }),
  });
}
