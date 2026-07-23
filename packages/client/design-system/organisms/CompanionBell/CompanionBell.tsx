import React from 'react';
import { Bell } from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Typography,
  Badge,
  Popover,
  Spinner,
  Avatar,
  useTranslate,
} from '@almadar/ui';
import { Icon as IconifyIcon } from '@iconify/react';
import { useCompanionContext } from '@features/companion/CompanionContext';
import { useEventBus } from '@almadar/ui';
import { renderSuggestionTitle, renderSuggestionBody } from '@features/companion/renderSuggestion';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const suggestionIcons: Record<string, string> = {
  expand: 'ph:arrows-out-simple',
  study: 'ph:book-open',
  review: 'ph:eye',
  connect: 'ph:link',
  discover: 'ph:compass',
};

export const CompanionBell: React.FC = () => {
  const { t } = useTranslate();
  const { emit } = useEventBus();
  const { persona, suggestions, events, loading, accept, dismiss } = useCompanionContext();

  const unreadCount = suggestions.length;
  const latestProgress = loading && events.length > 0 ? events[events.length - 1].label : null;

  const handleOpenChat = () => {
    emit('UI:NAV_CLICK', { href: '/companion' });
  };

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t('companion.bell.aria')}
      title={t('companion.bell.aria')}
      className="relative h-8 w-8 rounded-md border-transparent p-0 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-transparent"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <Badge
          variant="primary"
          className="absolute -top-0.5 -end-0.5 min-w-4 h-4 flex items-center justify-center text-[0.625rem] px-1"
        >
          {unreadCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Popover
      trigger="click"
      position="bottom"
      showArrow={false}
      className="p-0 w-80 max-w-[calc(100vw-2rem)]"
      content={
        <VStack gap="none" className="bg-[var(--color-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-lg overflow-hidden">
          {/* Persona header */}
          <HStack gap="sm" align="center" className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {persona ? (
              persona.portraitUrl ? (
                <img
                  src={persona.portraitUrl}
                  alt={persona.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <Avatar initials={initialsOf(persona.name)} size="sm" />
              )
            ) : (
              <Box className="flex items-center justify-center rounded-full w-9 h-9 bg-[var(--color-muted)] shrink-0">
                <Spinner size="sm" />
              </Box>
            )}
            <VStack gap="none" className="min-w-0 flex-1">
              <Typography variant="small" weight="semibold" className="truncate">
                {persona ? persona.name : t('companion.chat.loading')}
              </Typography>
              <Typography variant="caption" color="secondary" className="truncate">
                {persona ? persona.description : t('companion.title')}
              </Typography>
            </VStack>
          </HStack>

          {/* Live progress while analyzing */}
          {loading && latestProgress && (
            <HStack gap="xs" align="center" className="px-4 py-2 bg-[var(--color-primary-muted)]">
              <IconifyIcon icon="ph:circle-notch" width={14} height={14} className="text-[var(--color-primary)] animate-spin" />
              <Typography variant="caption" color="secondary" className="italic">{latestProgress}…</Typography>
            </HStack>
          )}

          {/* Suggestion notifications */}
          {suggestions.length > 0 ? (
            <Box className="max-h-64 overflow-y-auto">
              {suggestions.map((s, i) => {
                const icon = suggestionIcons[s.type] ?? suggestionIcons.discover;
                return (
                  <Box key={`${s.type}-${s.target}-${i}`} className="px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-muted)] transition-colors">
                    <HStack gap="sm" align="start">
                      <Box className="shrink-0 mt-0.5 text-[var(--color-primary)]">
                        <IconifyIcon icon={icon} width={20} height={20} />
                      </Box>
                      <VStack gap="xs" className="min-w-0 flex-1">
                        <Typography variant="small" weight="semibold" className="truncate">
                          {renderSuggestionTitle(s, t)}
                        </Typography>
                        <Typography variant="caption" color="secondary" className="line-clamp-2">
                          {renderSuggestionBody(s, t)}
                        </Typography>
                        <HStack gap="xs" className="mt-1">
                          <Button size="sm" variant="primary" onClick={() => accept(s)}>
                            {t('companion.accept')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => dismiss(s)}>
                            {t('companion.dismiss')}
                          </Button>
                        </HStack>
                      </VStack>
                    </HStack>
                  </Box>
                );
              })}
            </Box>
          ) : (
            !loading && (
              <Box className="px-4 py-6 text-center">
                <Typography variant="small" color="secondary">
                  {t('companion.bell.empty')}
                </Typography>
              </Box>
            )
          )}

          {/* Chat CTA → navigates to /companion page */}
          <Box className="border-t border-[var(--color-border)] p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-2 border-transparent hover:bg-[var(--color-muted)] hover:border-transparent"
              onClick={handleOpenChat}
            >
              <IconifyIcon icon="ph:chat-circle-dots" width={18} height={18} className="text-[var(--color-primary)]" />
              {t('companion.bell.chat', { name: persona?.name ?? t('companion.title') })}
            </Button>
          </Box>
        </VStack>
      }
    >
      {trigger}
    </Popover>
  );
};
