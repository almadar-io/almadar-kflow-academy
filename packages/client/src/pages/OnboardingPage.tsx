import React, { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, useEventBus, useTranslate } from '@almadar/ui';
import { OnboardingBoard } from '@design-system/organisms/OnboardingBoard';
import type { OnboardingBoardEntity } from '@design-system/organisms/OnboardingBoard';
import { useAuthContext } from '../features/auth/AuthContext';
import { useCreateGoal } from '../features/learning/hooks/useCreateGoal';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { JUMP_BACK_IN_QUERY_KEY } from '../features/dashboard/hooks/useJumpBackIn';
import { knowledgeGraphKeys } from '../features/knowledge-graph/hooks/queryKeys';
import type { UiNotifyPayload } from '../app/uiEvents';
import type { LearningGoal } from '../features/learning/goalApi';
import kflowLogo from '../assets/kflow-logo.svg';

type StreamPartial = Partial<LearningGoal> & { id?: string };

export const OnboardingPage: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslate();
  const navigate = useNavigateEvent();
  const { emit } = useEventBus();
  const queryClient = useQueryClient();
  const { createWithGraph, isLoading, error, partialGoal } = useCreateGoal();
  const contentAccRef = useRef('');
  const [partialTitle, setPartialTitle] = useState<string>('');

  const handleComplete = useCallback(
    async (anchorAnswer: string) => {
      setPartialTitle('');
      contentAccRef.current = '';
      try {
        const result = await createWithGraph(
          {
            anchorAnswer,
            questionAnswers: [],
            goalFocused: true,
            stream: true,
          },
          (_chunk: string, partial: StreamPartial) => {
            if (partial && partial.title) {
              setPartialTitle(partial.title);
            }
          },
        );

        if (result) {
          await queryClient.invalidateQueries({ queryKey: JUMP_BACK_IN_QUERY_KEY });
          await queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.learningPaths() });
          navigate(`/concepts/${result.graphId}`);
        }
      } catch {
        emit('UI:NOTIFY', {
          severity: 'error',
          message: t('onboarding.error'),
        } satisfies UiNotifyPayload);
      }
    },
    [createWithGraph, navigate, queryClient, t, emit],
  );

  const handleSkip = useCallback(() => {
    navigate('/home');
  }, [navigate]);

  const entity: OnboardingBoardEntity = {
    welcomeName: user?.displayName?.split(' ')[0] ?? t('nav.user'),
    isCreating: isLoading,
    partialGoalTitle: partialTitle || partialGoal?.title,
    error: error,
  };

  return (
    <Box className="min-h-screen bg-background">
      <Box className="flex items-center justify-center py-6 cursor-pointer" onClick={() => navigate('/home')}>
        <img src={kflowLogo} alt="KFlow" className="h-8" />
      </Box>
      <OnboardingBoard
        entity={entity}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </Box>
  );
};
