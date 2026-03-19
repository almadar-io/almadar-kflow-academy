import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import type { KFlowEvent } from '@almadar/ui';
import { KnowledgeStoryTemplate } from '@design-system/templates/KnowledgeStoryTemplate';
import { useStory } from '../hooks/useStory';
import { useStoryProgress } from '../hooks/useStoryProgress';

export const StoryPlayPageContainer: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const { story, isLoading } = useStory(storyId);
  const { saveProgress } = useStoryProgress();
  // eslint-disable-next-line almadar/no-use-navigate
  const navigate = useNavigate();
  const { on } = useEventBus();

  useEffect(() => {
    const unsubFinish = on('UI:STORY_FINISH', (event: KFlowEvent) => {
      const sid = event.payload?.storyId as string;
      if (sid) {
        saveProgress(sid, 100, true);
        navigate('/stories');
      }
    });
    return unsubFinish;
  }, [on, navigate, saveProgress]);

  useEffect(() => {
    const unsubComplete = on('UI:STORY_GAME_COMPLETE', (event: KFlowEvent) => {
      const sid = event.payload?.storyId as string;
      const score = (event.payload?.result as { score: number })?.score;
      if (sid && score != null) saveProgress(sid, score, true);
    });
    return unsubComplete;
  }, [on, saveProgress]);

  if (isLoading || !story) {
    return <KnowledgeStoryTemplate entity={undefined} />;
  }

  return <KnowledgeStoryTemplate entity={story} />;
};

StoryPlayPageContainer.displayName = 'StoryPlayPageContainer';
