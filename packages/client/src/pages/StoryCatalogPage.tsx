import React, { useEffect } from 'react';
import { useEventBus } from '@almadar/ui';
import type { BusEvent } from '@almadar/core';
import { StoryCatalogTemplate } from '@design-system/templates/StoryCatalogTemplate';
import type { StoryCatalogEntity } from '@design-system/organisms/StoryCatalogBoard';
import { useStories } from '../features/stories/hooks/useStories';
import { useSeriesList } from '../features/stories/hooks/useSeries';
import { useNavigateEvent } from '../hooks/useNavigateEvent';

export const StoryCatalogPage: React.FC = () => {
  const { stories, isLoading: storiesLoading, error: storiesError } = useStories();
  const { series, isLoading: seriesLoading } = useSeriesList();
  const navigate = useNavigateEvent();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:STORY_SELECT', (event: BusEvent) => {
      const storyId = event.payload?.storyId as string;
      if (storyId) navigate(`/stories/${storyId}`);
    });
    return unsub;
  }, [on, navigate]);

  const isLoading = storiesLoading || seriesLoading;
  const error = storiesError ? { message: storiesError } : null;

  const featured = stories.find(s => s.rating != null && s.rating >= 4.8);

  const entity: StoryCatalogEntity = {
    stories,
    featuredStory: featured,
    domains: ['formal', 'natural', 'social'],
    series,
  };

  return <StoryCatalogTemplate entity={entity} isLoading={isLoading} error={error} />;
};

StoryCatalogPage.displayName = 'StoryCatalogPage';
