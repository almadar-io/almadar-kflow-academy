import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { useEventBus } from '@almadar/ui';
import type { BusEvent } from '@almadar/core';
import { KnowledgeStoryTemplate } from '@design-system/templates/KnowledgeStoryTemplate';
import { useStory } from '../features/stories/hooks/useStory';
import { useStoryProgress } from '../features/stories/hooks/useStoryProgress';
import { useNavigateEvent } from '../hooks/useNavigateEvent';

export const StoryPlayPage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const { story, isLoading, error } = useStory(storyId);
  const { saveProgress } = useStoryProgress();
  const navigate = useNavigateEvent();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:STORY_FINISH', (event: BusEvent) => {
      const sid = event.payload?.storyId as string;
      if (sid) {
        saveProgress(sid, 100, true);
        navigate('/stories');
      }
    });
    return unsub;
  }, [on, navigate, saveProgress]);

  useEffect(() => {
    const unsub = on('UI:STORY_GAME_COMPLETE', (event: BusEvent) => {
      const sid = event.payload?.storyId as string;
      const score = (event.payload?.result as { score: number } | undefined)?.score;
      if (sid && score != null) saveProgress(sid, score, true);
    });
    return unsub;
  }, [on, saveProgress]);

  const uiError = error ? { message: error } : null;

  return (
    <KnowledgeStoryTemplate
      entity={story ?? undefined}
      isLoading={isLoading}
      error={uiError}
    />
  );
};

StoryPlayPage.displayName = 'StoryPlayPage';
