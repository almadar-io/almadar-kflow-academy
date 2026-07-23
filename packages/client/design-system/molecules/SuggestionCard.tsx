import { useCallback } from 'react';
import { Button, Card, useTranslate } from '@almadar/ui';
import { Icon as IconifyIcon } from '@iconify/react';
import type { Suggestion } from '@kflow-academy/shared';
import { renderSuggestionTitle, renderSuggestionBody } from '@features/companion/renderSuggestion';

export interface SuggestionCardProps {
  suggestion: Suggestion;
  onAccept: (suggestion: Suggestion) => void;
  onDismiss: () => void;
  onAskWhy: () => void;
}

const suggestionIcons: Record<string, string> = {
  expand: 'ph:arrows-out-simple',
  study: 'ph:book-open',
  review: 'ph:eye',
  connect: 'ph:link',
  discover: 'ph:compass',
};

export function SuggestionCard({ suggestion, onAccept, onDismiss, onAskWhy }: SuggestionCardProps) {
  const { t } = useTranslate();
  const icon = suggestionIcons[suggestion.type] ?? suggestionIcons.discover;
  const title = renderSuggestionTitle(suggestion, t);
  const body = renderSuggestionBody(suggestion, t);

  const handleAccept = useCallback(() => onAccept(suggestion), [suggestion, onAccept]);

  return (
    <Card className="p-4 space-y-3 border border-border bg-surface shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-primary">
          <IconifyIcon icon={icon} width={24} height={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text text-sm">{title}</h3>
          <p className="text-sm text-text-muted mt-1">{body}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="primary" onClick={handleAccept}>
          {t('companion.accept')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          {t('companion.dismiss')}
        </Button>
        <Button size="sm" variant="secondary" onClick={onAskWhy}>
          <IconifyIcon icon="ph:chat-circle" width={16} height={16} className="me-1" />
          {t('companion.askWhy')}
        </Button>
      </div>
    </Card>
  );
}
