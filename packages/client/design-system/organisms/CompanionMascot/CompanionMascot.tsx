import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Badge, Presence, useTranslate } from '@almadar/ui';
import { Icon as IconifyIcon } from '@iconify/react';
import { SuggestionCard } from '../../molecules/SuggestionCard';
import type { Suggestion } from '@kflow-academy/shared';

export interface CompanionMascotProps {
  suggestion: Suggestion | null;
  loading: boolean;
  onAccept: (suggestion: Suggestion) => void;
  onDismiss: () => void;
  onAskWhy: () => void;
}

export function CompanionMascot({ suggestion, loading, onAccept, onDismiss, onAskWhy }: CompanionMascotProps) {
  const { t } = useTranslate();
  const [showCard, setShowCard] = useState(false);
  // Keep a render copy so SuggestionCard doesn't get null during Presence exit animation.
  const renderRef = useRef<Suggestion | null>(null);

  useEffect(() => {
    if (suggestion) {
      renderRef.current = suggestion;
    }
  }, [suggestion]);

  const handleMascotClick = useCallback(() => {
    setShowCard(prev => !prev);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowCard(false);
    onDismiss();
  }, [onDismiss]);

  const handleAccept = useCallback((s: Suggestion) => {
    setShowCard(false);
    onAccept(s);
  }, [onAccept]);

  const handleAskWhy = useCallback(() => {
    setShowCard(false);
    onAskWhy();
  }, [onAskWhy]);

  const hasSuggestion = suggestion !== null;

  return (
    <div className="fixed bottom-4 end-4 z-50 flex flex-col items-end gap-2">
      <Presence
        show={showCard && hasSuggestion}
        animation="slide-up"
      >
        <div className="w-80 max-w-[calc(100vw-2rem)]">
          {renderRef.current && (
            <SuggestionCard
              suggestion={renderRef.current}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              onAskWhy={handleAskWhy}
            />
          )}
        </div>
      </Presence>

      <div className="relative">
        {hasSuggestion && (
          <Badge
            variant="primary"
            className="absolute -top-1 -end-1 min-w-5 h-5 flex items-center justify-center text-xs animate-pulse"
          >
            1
          </Badge>
        )}
        <Button
          variant="ghost"
          size="md"
          onClick={handleMascotClick}
          className="!rounded-full !w-12 !h-12 !p-0 shadow-lg bg-surface border border-border hover:bg-surface-hover"
          aria-label={t('companion.title')}
        >
          {loading ? (
            <IconifyIcon icon="ph:spinner-gap" width={24} height={24} className="animate-spin" />
          ) : (
            <IconifyIcon icon="ph:sparkle" width={24} height={24} className="text-primary" />
          )}
        </Button>
      </div>
    </div>
  );
}
