import React, { useMemo } from 'react';
import { X, Users, Sparkles } from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Card,
  Button,
  Typography,
  Badge,
  Overlay,
  Spinner,
  useTranslate,
} from '@almadar/ui';
import { useNodePeers, useCreateConnection } from '../../src/features/connections/hooks/useConnections';
import type { NodeKey, NodeKind } from '@kflow-academy/shared';

export interface PeerModalProps {
  nodeKey: NodeKey;
  onClose: () => void;
  onConnected: (connectionId: string) => void;
  /** Open the on-the-fly AI concept chat for this concept (always available). */
  onChatWithOriginator?: (conceptLabel: string) => void;
}

function parseNodeKey(nodeKey: NodeKey): { kind: NodeKind; canonicalId: string } {
  const idx = nodeKey.indexOf(':');
  const kind = (idx === -1 ? 'concept' : nodeKey.slice(0, idx)) as NodeKind;
  const canonicalId = idx === -1 ? nodeKey : nodeKey.slice(idx + 1);
  return { kind, canonicalId };
}

/** A concept id is not a concept name — the AI tutor can't address it. */
function looksLikeId(label: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(label) || /^\d+$/.test(label);
}

/**
 * Anonymous peer list for a node. Peers are addressed by an opaque `peerRef` only —
 * no uid or identity is ever rendered. An AI Tutor peer is pinned at the top (always
 * available) so a learner can always converse about the concept even with no human peers.
 */
export const PeerModal: React.FC<PeerModalProps> = ({ nodeKey, onClose, onConnected, onChatWithOriginator }) => {
  const { t } = useTranslate();
  const { data: peers, isLoading } = useNodePeers(nodeKey);
  const create = useCreateConnection();
  const origin = useMemo(() => parseNodeKey(nodeKey), [nodeKey]);

  const handleConnect = (peerRef: string) => {
    create.mutate(
      { peerRef, origin },
      { onSuccess: ({ id }) => onConnected(id) },
    );
  };

  return (
    <Box className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Overlay onClick={onClose} />
      <Card className="relative z-50 max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 animate-modal-in">
        <Box className="absolute top-3 right-3 z-10">
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label={t('learning.close')} />
        </Box>
        <VStack gap="md">
          <HStack gap="sm" align="center">
            <Users size={20} className="text-[var(--color-primary)]" />
            <Typography variant="h3">{t('connections.title')}</Typography>
          </HStack>
          <Typography variant="small" color="secondary" className="truncate">
            {origin.canonicalId}
          </Typography>

          <VStack gap="sm">
            {/* AI Tutor — always-available peer (persona generates on chat open) */}
            {onChatWithOriginator && origin.canonicalId && !looksLikeId(origin.canonicalId) && (
              <Card padding="sm" className="flex items-center justify-between gap-3 border border-[var(--color-primary)]">
                <VStack gap="xs" className="min-w-0 flex-1">
                  <HStack gap="xs" align="center">
                    <Sparkles size={16} className="text-[var(--color-primary)] shrink-0" />
                    <Typography variant="body" weight="semibold" className="truncate">
                      {t('connections.aiTutor')}
                    </Typography>
                    <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                      <Sparkles size={12} /> {t('connections.ai')}
                    </Badge>
                  </HStack>
                  <Typography variant="small" color="secondary">
                    {t('connections.aiTutorDesc')}
                  </Typography>
                </VStack>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onChatWithOriginator(origin.canonicalId)}
                >
                  {t('connections.chat')}
                </Button>
              </Card>
            )}

            {/* Human peers */}
            {isLoading ? (
              <VStack align="center" className="py-6"><Spinner /></VStack>
            ) : !peers || peers.length === 0 ? (
              <Typography variant="small" color="secondary" className="py-4 text-center">
                {t('connections.noOtherPeers')}
              </Typography>
            ) : (
              peers.map((peer) => (
                <Card key={peer.peerRef} padding="sm" className="flex items-center justify-between gap-3">
                  <VStack gap="xs" className="min-w-0 flex-1">
                    <HStack gap="xs" align="center">
                      <Typography variant="body" weight="semibold" className="truncate">
                        {peer.anonymousHandle}
                      </Typography>
                      {peer.activeNow && (
                        <Badge variant="success">{t('connections.activeNow')}</Badge>
                      )}
                    </HStack>
                    <HStack gap="md">
                      <Typography variant="small" color="secondary">
                        {t('connections.convergence', { pct: String(peer.convergencePct) })}
                      </Typography>
                      <Typography variant="small" color="secondary">
                        {t('connections.concepts', { count: String(peer.conceptsCompleted) })}
                      </Typography>
                    </HStack>
                  </VStack>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleConnect(peer.peerRef)}
                    isLoading={create.isPending}
                  >
                    {t('connections.connect')}
                  </Button>
                </Card>
              ))
            )}
          </VStack>
        </VStack>
      </Card>
    </Box>
  );
};
