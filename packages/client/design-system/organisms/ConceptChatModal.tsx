import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
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
import { useConceptChat } from '../../src/features/concept-chat/hooks/useConceptChat';

export interface ConceptChatModalProps {
  conceptLabel: string;
  onClose: () => void;
}

// Deterministic hue from the persona name → a stable avatar color (no real portrait on the fly).
function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Always-available concept chat: an on-the-fly AI persona (the concept's originator)
 * generated when the modal opens. Held in memory for the session; no scheduler or pool.
 */
export const ConceptChatModal: React.FC<ConceptChatModalProps> = ({ conceptLabel, onClose }) => {
  const { t } = useTranslate();
  const { persona, transcript, isStarting, isSending, start, send } = useConceptChat(conceptLabel);
  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript.length, isSending]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || !persona || isSending) return;
    send(content);
    setDraft('');
  };

  const hue = persona ? hueFor(persona.name) : 0;

  return (
    <Box className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Overlay onClick={onClose} />
      <Card className="relative z-50 max-w-lg w-full max-h-[85vh] flex flex-col p-6">
        <Box className="absolute top-3 right-3 z-10">
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label={t('learning.close')} />
        </Box>
        <VStack gap="md" className="min-h-0 flex-1">
          <HStack gap="sm" align="center">
            {persona ? (
              <Box
                className="flex items-center justify-center rounded-full w-10 h-10 text-white text-sm font-semibold shrink-0"
                style={{ backgroundColor: `hsl(${hue} 55% 45%)` }}
              >
                {initialsOf(persona.name)}
              </Box>
            ) : (
              <Box className="flex items-center justify-center rounded-full w-10 h-10 bg-[var(--color-muted)] shrink-0">
                <Spinner size="sm" />
              </Box>
            )}
            <VStack gap="none" className="min-w-0">
              <HStack gap="xs" align="center">
                <Typography variant="h4" className="truncate">
                  {persona ? persona.name : t('conceptChat.generating')}
                </Typography>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Sparkles size={12} /> {t('conceptChat.aiLabel')}
                </Badge>
              </HStack>
              <Typography variant="small" color="secondary" className="truncate">
                {conceptLabel}
              </Typography>
            </VStack>
          </HStack>

          {persona && (
            <Typography variant="small" color="secondary" className="italic">
              {persona.description}
            </Typography>
          )}

          <Box className="flex-1 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 bg-[var(--color-muted)]">
            <VStack gap="sm">
              {transcript.map((m, i) => (
                <Box
                  key={i}
                  className={`max-w-[85%] rounded-[var(--radius-md)] px-3 py-2 ${
                    m.role === 'user'
                      ? 'self-end bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'self-start bg-[var(--color-card)] border border-[var(--color-border)]'
                  }`}
                >
                  <Typography variant="small" className="whitespace-pre-wrap break-words">{m.content}</Typography>
                </Box>
              ))}
              {isSending && (
                <HStack gap="xs" align="center" className="self-start">
                  <Spinner size="sm" />
                  <Typography variant="small" color="secondary">{t('conceptChat.thinking')}</Typography>
                </HStack>
              )}
              <div ref={listEndRef} />
            </VStack>
          </Box>

          <HStack gap="sm" align="center">
            <input
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
              placeholder={persona ? t('conceptChat.composerPlaceholder') : ''}
              value={draft}
              disabled={!persona || isSending}
              onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              variant="primary"
              icon={Send}
              onClick={handleSend}
              isLoading={isSending}
              disabled={!persona}
              aria-label={t('conceptChat.send')}
            >
              {t('conceptChat.send')}
            </Button>
          </HStack>
        </VStack>
      </Card>
    </Box>
  );
};
