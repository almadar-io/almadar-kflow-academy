import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import { StoriesShellTemplate } from '@design-system/templates/StoriesShellTemplate';
import { StoryCatalogTemplate } from '@design-system/templates/StoryCatalogTemplate';
import { useStories } from '../hooks/useStories';
import { useSeriesList } from '../hooks/useSeries';
import type { StoryCatalogEntity } from '@design-system/organisms/StoryCatalogBoard';

export const StoryCatalogPageContainer: React.FC = () => {
  const { stories, isLoading: isLoadingStories, error: storiesError } = useStories();
  const { series, isLoading: isLoadingSeries } = useSeriesList();
  // eslint-disable-next-line almadar/no-use-navigate
  const navigate = useNavigate();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:STORY_SELECT', (payload: { storyId: string }) => {
      navigate(`/stories/${payload.storyId}`);
    });
    return unsub;
  }, [on, navigate]);

  const featured = stories.find(s => s.rating && s.rating >= 4.8);

  const entity: StoryCatalogEntity = {
    stories,
    featuredStory: featured,
    domains: ['formal', 'natural', 'social'],
    series,
  };

  if (storiesError) {
    return (
      <StoriesShellTemplate entity={{ activeRoute: 'catalog' }}>
        <StoryCatalogTemplate entity={entity} error={storiesError} />
      </StoriesShellTemplate>
    );
  }

  return (
    <StoriesShellTemplate entity={{ activeRoute: 'catalog' }}>
      <StoryCatalogTemplate entity={entity} isLoading={isLoadingStories || isLoadingSeries} />
    </StoriesShellTemplate>
  );
};

StoryCatalogPageContainer.displayName = 'StoryCatalogPageContainer';
