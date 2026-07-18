import React, { useState, useRef, useEffect } from 'react';
import { Send, Flag } from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Card,
  Button,
  Typography,
  Badge,
  Spinner,
  useTranslate,
} from '@almadar/ui';
import {
  useConnection,
  useSendMessage,
  useSetActiveBadge,
} from '../../src/features/connections/hooks/useConnections';

export interface ConnectionThreadProps {
  connectionId: string;
}

/**
 * Grounded 1:1 thread: grounding badges (one active), message list (flagged messages
 * marked, not hidden), and a badge-scoped composer. Async — polls for peer replies.
 */
export const ConnectionThread: React.FC<ConnectionThreadProps> = ({ connectionId }) => {
  const { t } = useTranslate();
  const { data: conn, isLoading } = useConnection(connectionId);
  const send = useSendMessage(connectionId);
  const setActiveBadge = useSetActiveBadge(connectionId);
  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const activeBadgeId = conn?.badges.find((b) => b.active)?.id ?? conn?.badges[0]?.id;

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conn?.messages.length]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || !conn) return;
    send.mutate({ content, activeBadgeId });
    setDraft('');
  };

  if (isLoading || !conn) {
    return <VStack align="center" className="py-16"><Spinner size="lg" /></VStack>;
  }

  return (
    <VStack gap="md" className="h-full">
      <Box>
        <Typography variant="small" color="secondary">{t('connections.discussing')}</Typography>
        <Typography variant="h4" className="truncate">{conn.origin.canonicalId}</Typography>
      </Box>

      {conn.badges.length > 0 && (
        <HStack gap="xs" wrap>
          {conn.badges.map((b) => (
            <Badge
              key={b.id}
              variant={b.id === activeBadgeId ? 'primary' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setActiveBadge.mutate(b.id)}
            >
              {b.label}
            </Badge>
          ))}
        </HStack>
      )}

      <Box className="flex-1 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 bg-[var(--color-muted)]">
        <VStack gap="sm">
          {conn.messages.length === 0 ? (
            <Typography variant="small" color="secondary" className="text-center py-8">
              {t('connections.startDiscussion')}
            </Typography>
          ) : (
            conn.messages.map((m) => (
              <Box
                key={m.id}
                className={`max-w-[80%] rounded-[var(--radius-md)] px-3 py-2 ${
                  m.fromViewer
                    ? 'self-end bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'self-start bg-[var(--color-card)] border border-[var(--color-border)]'
                }`}
              >
                <Typography variant="small" className="whitespace-pre-wrap break-words">{m.content}</Typography>
                {m.moderation?.flagged && (
                  <HStack gap="xs" align="center" className="mt-1 opacity-80">
                    <Flag size={11} />
                    <Typography variant="small">{t('connections.flaggedOffTopic')}</Typography>
                  </HStack>
                )}
              </Box>
            ))
          )}
          <div ref={listEndRef} />
        </VStack>
      </Box>

      <HStack gap="sm" align="center">
        <input
          className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
          placeholder={t('connections.composerPlaceholder')}
          value={draft}
          onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button variant="primary" icon={Send} onClick={handleSend} isLoading={send.isPending} aria-label={t('connections.send')}>
          {t('connections.send')}
        </Button>
      </HStack>
    </VStack>
  );
};
