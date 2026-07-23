import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Typography,
  Badge,
  Modal,
  Spinner,
  Avatar,
  useTranslate,
} from '@almadar/ui';
import { Icon as IconifyIcon } from '@iconify/react';
import type { CompanionPersonaDTO } from '@kflow-academy/shared';
import type { CompanionEvent } from '@features/companion/hooks/useCompanion';
import { renderSuggestionTitle, renderSuggestionBody } from '@features/companion/renderSuggestion';
import type { Suggestion } from '@kflow-academy/shared';

export interface CompanionChatProps {
  persona: CompanionPersonaDTO | null;
  events: CompanionEvent[];
  suggestions: Suggestion[];
  loading: boolean;
  replying: boolean;
  onReply: (message: string) => Promise<string>;
  onAcceptSuggestion: (suggestion: Suggestion) => void;
  onClose: () => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const CompanionChat: React.FC<CompanionChatProps> = ({
  persona,
  events,
  suggestions,
  loading,
  replying,
  onReply,
  onAcceptSuggestion,
  onClose,
}) => {
  const { t } = useTranslate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const seenEventIds = useRef<Set<number>>(new Set());

  // Greeting when persona arrives
  useEffect(() => {
    if (persona && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t('companion.chat.greeting', { name: persona.name }) }]);
    }
  }, [persona, messages.length, t]);

  // Auto-scroll
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, events.length, loading, replying]);

  // When analysis completes with a suggestion, post it as an assistant message (once)
  const lastSuggestionSig = useRef<string | null>(null);
  useEffect(() => {
    if (suggestions.length > 0 && !loading) {
      const s = suggestions[0];
      const sig = `${s.type}:${s.target}`;
      if (lastSuggestionSig.current !== sig) {
        lastSuggestionSig.current = sig;
        const title = renderSuggestionTitle(s, t);
        const body = renderSuggestionBody(s, t);
        setMessages(prev => [...prev, { role: 'assistant', content: `${title}\n\n${body}` }]);
      }
    }
  }, [suggestions, loading, t]);

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || replying) return;
    setDraft('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    try {
      const reply = await onReply(content);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('companion.chat.replyError') }]);
    }
  }, [draft, replying, onReply, t]);

  const [open, setOpen] = useState(true);
  const requestClose = () => setOpen(false);

  const toolEventIcons: Record<string, string> = {
    summarize_trajectory: 'ph:chart-line-up',
    find_convergence: 'ph:git-merge',
    summarize_cluster: 'ph:squares-four',
    find_gap: 'ph:magnifying-glass',
    suggest_expansion: 'ph:arrows-out-simple',
    suggest_next_step: 'ph:compass',
    draft_nudge: 'ph:pen-nib',
    ask_companion: 'ph:brain',
  };

  return (
    <Modal isOpen={open} onClose={requestClose} onExited={onClose} showCloseButton={false} size="lg">
      <Box className="relative flex flex-col max-h-[80vh]">
        <Box className="absolute top-3 end-3 z-10">
          <Button variant="ghost" size="sm" icon={X} onClick={requestClose} aria-label={t('learning.close')} />
        </Box>
        <VStack gap="md" className="min-h-0 flex-1">
          {/* Persona header */}
          <HStack gap="sm" align="center">
            {persona ? (
              persona.portraitUrl ? (
                <img
                  src={persona.portraitUrl}
                  alt={persona.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <Avatar initials={initialsOf(persona.name)} size="sm" />
              )
            ) : (
              <Box className="flex items-center justify-center rounded-full w-10 h-10 bg-[var(--color-muted)] shrink-0">
                <Spinner size="sm" />
              </Box>
            )}
            <VStack gap="none" className="min-w-0">
              <HStack gap="xs" align="center">
                <Typography variant="h4" className="truncate">
                  {persona ? persona.name : t('companion.chat.loading')}
                </Typography>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <IconifyIcon icon="ph:sparkle" width={12} /> {t('companion.chat.aiLabel')}
                </Badge>
              </HStack>
              <Typography variant="small" color="secondary" className="truncate">
                {persona ? persona.description : ''}
              </Typography>
            </VStack>
          </HStack>

          {/* Transcript */}
          <Box className="flex-1 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 bg-[var(--color-muted)] min-h-[300px]">
            <VStack gap="sm">
              {messages.map((m, i) => (
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

              {/* Live SSE status events during analysis */}
              {loading && events.map(ev => {
                if (seenEventIds.current.has(ev.id)) return null;
                seenEventIds.current.add(ev.id);
                return (
                  <HStack key={ev.id} gap="xs" align="center" className="self-start ps-2">
                    <IconifyIcon icon={toolEventIcons[ev.tool ?? ''] ?? 'ph:circle-notch'} width={14} height={14} className="text-[var(--color-primary)] animate-spin" />
                    <Typography variant="caption" color="secondary" className="italic">{ev.label}…</Typography>
                  </HStack>
                );
              })}

              {/* "Thinking" indicator while replying to a user message */}
              {replying && (
                <HStack gap="xs" align="center" className="self-start">
                  <Spinner size="sm" />
                  <Typography variant="small" color="secondary">{t('companion.chat.thinking')}</Typography>
                </HStack>
              )}
              <div ref={listEndRef} />
            </VStack>
          </Box>

          {/* Suggestion quick-actions (if any active) */}
          {suggestions.length > 0 && !loading && (
            <Box className="border border-[var(--color-primary)] rounded-[var(--radius-md)] p-3 bg-[var(--color-primary-muted)]">
              <Typography variant="small" weight="semibold" className="mb-1">
                {renderSuggestionTitle(suggestions[0], t)}
              </Typography>
              <Typography variant="caption" color="secondary" className="mb-2 block">
                {renderSuggestionBody(suggestions[0], t)}
              </Typography>
              <Button size="sm" variant="primary" onClick={() => onAcceptSuggestion(suggestions[0])}>
                {t('companion.accept')}
              </Button>
            </Box>
          )}

          {/* Input */}
          <HStack gap="sm" align="center">
            <input
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
              placeholder={t('companion.chat.composerPlaceholder')}
              value={draft}
              disabled={replying}
              onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button
              variant="primary"
              icon={Send}
              onClick={() => void handleSend()}
              isLoading={replying}
              disabled={!draft.trim()}
              aria-label={t('companion.chat.send')}
            >
              {t('companion.chat.send')}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Modal>
  );
};
