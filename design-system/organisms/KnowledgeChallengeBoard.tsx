/**
 * KnowledgeChallengeBoard Organism (Milestone 7)
 *
 * Reads challenge.tier to select which @almadar/ui board to render:
 * - sequencer → SequencerBoard
 * - event-handler → EventHandlerBoard
 * - state-architect → StateArchitectBoard
 *
 * Wraps in domain-themed layout with timer, hint system, progress.
 *
 * Events Emitted:
 * - UI:CHALLENGE_COMPLETE
 * - UI:CHALLENGE_FAIL
 * - UI:USE_HINT
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Typography,
  Card,
  Button,
  Container,
  ProgressBar,
  Icon,
  PageHeader,
  Section,
  LoadingState,
  useEventBus,
  useTranslate,
  type EntityDisplayProps,
} from '@almadar/ui';
import { SequencerBoard } from '@almadar/ui';
import { EventHandlerBoard } from '@almadar/ui';
import { StateArchitectBoard } from '@almadar/ui';
import { Clock, Lightbulb } from 'lucide-react';
import type { KnowledgeChallenge, KnowledgePlayer, ChallengeTier } from '../types/knowledge';
import { DomainBadge } from '../atoms/DomainBadge';
import { XpCounter } from '../atoms/XpCounter';

export interface KnowledgeChallengeEntity {
  challenge: KnowledgeChallenge;
  player: KnowledgePlayer;
  progress: number;
  hints: string[];
  hintsUsed: number;
  timeRemaining: number;
  /** Puzzle entity for the tier-specific board (SequencerPuzzleEntity | EventHandlerPuzzleEntity | StateArchitectPuzzleEntity) */
  puzzleEntity?: Record<string, unknown>;
}

export interface KnowledgeChallengeBoardProps extends EntityDisplayProps<KnowledgeChallengeEntity> {
  className?: string;
}

export function KnowledgeChallengeBoard({
  entity,
  isLoading,
  className = '',
}: KnowledgeChallengeBoardProps): React.JSX.Element {
  const { emit, on } = useEventBus();
  const { t } = useTranslate();

  // Resolve entity from runtime-injected array or direct object
  const resolved = Array.isArray(entity) ? entity[0] : (entity as KnowledgeChallengeEntity | undefined);

  // Extract fields used in hooks with safe defaults
  const challengeId = resolved?.challenge?.id ?? '';
  const initialTime = resolved?.timeRemaining ?? 0;
  const initialHintsUsed = resolved?.hintsUsed ?? 0;

  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [currentHintsUsed, setCurrentHintsUsed] = useState(initialHintsUsed);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const tierLabels: Record<ChallengeTier, string> = {
    sequencer: t('challenge.tier.sequencer'),
    'event-handler': t('challenge.tier.eventHandler'),
    'state-architect': t('challenge.tier.stateArchitect'),
    battle: t('challenge.tier.battle'),
  };

  useEffect(() => {
    if (completed || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((time: number) => {
        if (time <= 1) {
          clearInterval(timerRef.current);
          emit('UI:CHALLENGE_FAIL', { challengeId });
          return 0;
        }
        return time - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [completed, timeLeft, challengeId, emit]);

  const handleHint = useCallback(() => {
    if (!resolved) return;
    const { challenge } = resolved;
    if (currentHintsUsed < challenge.hints.length) {
      setCurrentHintsUsed((h: number) => h + 1);
      emit('UI:USE_HINT', { challengeId: challenge.id, hintIndex: currentHintsUsed });
    }
  }, [resolved, currentHintsUsed, emit]);

  const handleBoardComplete = useCallback((payload: { success: boolean }) => {
    if (!resolved) return;
    const { challenge } = resolved;
    setCompleted(true);
    clearInterval(timerRef.current);
    emit('UI:CHALLENGE_COMPLETE', {
      challengeId: challenge.id,
      correct: payload.success,
      timeUsed: challenge.timeLimit - timeLeft,
      hintsUsed: currentHintsUsed,
    });
  }, [resolved, timeLeft, currentHintsUsed, emit]);

  // Listen for tier board completion
  useEffect(() => {
    const unsub = on('UI:CHALLENGE_TIER_COMPLETE', (event) => {
      const success = Boolean(event.payload?.success);
      handleBoardComplete({ success });
    });
    return unsub;
  }, [on, handleBoardComplete]);

  // Early return after all hooks
  if (isLoading || !resolved) {
    return <LoadingState message="Loading..." />;
  }

  const { challenge, puzzleEntity } = resolved;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const renderTierBoard = () => {
    if (!puzzleEntity) return null;

    switch (challenge.tier) {
      case 'sequencer':
        return (
          <SequencerBoard
            entity={puzzleEntity as unknown as Parameters<typeof SequencerBoard>[0]['entity']}
            completeEvent="CHALLENGE_TIER_COMPLETE"
          />
        );
      case 'event-handler':
        return (
          <EventHandlerBoard
            entity={puzzleEntity as unknown as Parameters<typeof EventHandlerBoard>[0]['entity']}
            completeEvent="CHALLENGE_TIER_COMPLETE"
          />
        );
      case 'state-architect':
        return (
          <StateArchitectBoard
            entity={puzzleEntity as unknown as Parameters<typeof StateArchitectBoard>[0]['entity']}
            completeEvent="CHALLENGE_TIER_COMPLETE"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box className={`min-h-screen bg-[var(--color-background)] ${className}`}>
      <PageHeader
        title={challenge.topic}
        subtitle={tierLabels[challenge.tier as ChallengeTier]}
        status={{ label: formatTime(timeLeft), variant: timeLeft < 30 ? 'danger' : 'info' }}
      >
        <HStack gap="sm" align="center">
          <DomainBadge domain={challenge.domain} size="md" />
          <Icon icon={Clock} size="sm" />
        </HStack>
        <ProgressBar
          value={timeLeft}
          max={challenge.timeLimit}
          size="sm"
          variant={timeLeft < 30 ? 'danger' : 'primary'}
        />
      </PageHeader>

      <Container size="lg" padding="sm" className="py-6">
        <VStack gap="lg">
          {/* Challenge prompt */}
          <Section variant="card">
            <VStack gap="md">
              <Typography variant="body" className="text-[var(--color-foreground)]">
                {challenge.prompt}
              </Typography>

              {currentHintsUsed > 0 && (
                <VStack gap="xs">
                  {challenge.hints.slice(0, currentHintsUsed).map((hint: string, i: number) => (
                    <HStack key={i} gap="xs" align="start">
                      <Icon icon={Lightbulb} size="xs" className="text-[var(--color-warning)] mt-0.5" />
                      <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">{hint}</Typography>
                    </HStack>
                  ))}
                </VStack>
              )}
            </VStack>
          </Section>

          {/* Tier-specific game board */}
          {renderTierBoard()}

          {/* Actions */}
          <HStack justify="between" align="center">
            <Button
              size="sm"
              variant="secondary"
              className="px-4 py-2 bg-gray-100 text-[var(--color-foreground)] rounded-lg hover:bg-gray-200 flex items-center gap-2"
              onClick={handleHint}
              disabled={currentHintsUsed >= challenge.hints.length}
            >
              <Lightbulb size={16} />
              {t('challenge.hint', { remaining: challenge.hints.length - currentHintsUsed })}
            </Button>
            <XpCounter xp={challenge.xpReward} domain={challenge.domain} label={t('challenge.reward')} />
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

KnowledgeChallengeBoard.displayName = 'KnowledgeChallengeBoard';
