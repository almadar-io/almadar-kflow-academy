import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import { StoriesShellTemplate } from '@design-system/templates/StoriesShellTemplate';
import { KnowledgeStoryTemplate } from '@design-system/templates/KnowledgeStoryTemplate';
import { useStory } from '../hooks/useStory';
import { useStoryProgress } from '../hooks/useStoryProgress';

export const StoryPlayPageContainer: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const { story, isLoading, error } = useStory(storyId);
  const { saveProgress } = useStoryProgress();
  // eslint-disable-next-line almadar/no-use-navigate
  const navigate = useNavigate();
  const { on } = useEventBus();

  useEffect(() => {
    const unsubFinish = on('UI:STORY_FINISH', (payload: { storyId: string }) => {
      saveProgress(payload.storyId, 100, true);
      navigate('/stories');
    });
    return unsubFinish;
  }, [on, navigate, saveProgress]);

  useEffect(() => {
    const unsubComplete = on('UI:STORY_GAME_COMPLETE', (payload: { storyId: string; result: { score: number } }) => {
      saveProgress(payload.storyId, payload.result.score, true);
    });
    return unsubComplete;
  }, [on, saveProgress]);

  if (isLoading || !story) {
    return (
      <StoriesShellTemplate entity={{ activeRoute: 'story' }}>
        <KnowledgeStoryTemplate entity={null} isLoading={true} />
      </StoriesShellTemplate>
    );
  }

  if (error) {
    return (
      <StoriesShellTemplate entity={{ activeRoute: 'story' }}>
        <KnowledgeStoryTemplate entity={null} error={error} />
      </StoriesShellTemplate>
    );
  }

  return (
    <StoriesShellTemplate
      entity={{
        activeRoute: 'story',
        breadcrumbs: [
          { label: 'Stories', href: '/stories' },
          { label: story.title },
        ],
      }}
    >
      <KnowledgeStoryTemplate entity={story} />
    </StoriesShellTemplate>
  );
};

StoryPlayPageContainer.displayName = 'StoryPlayPageContainer';
