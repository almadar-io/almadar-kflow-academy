import React, { useEffect } from 'react';
import { useEventBus } from '@almadar/ui';
import type { BusEvent } from '@almadar/core';
import { StoryCatalogTemplate } from '@design-system/templates/StoryCatalogTemplate';
import { useStories } from '../hooks/useStories';
import { useSeriesList } from '../hooks/useSeries';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import type { StoryCatalogEntity } from '@design-system/organisms/StoryCatalogBoard';

export const StoryCatalogPageContainer: React.FC = () => {
  const { stories } = useStories();
  const { series } = useSeriesList();
  const navigate = useNavigateEvent();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:STORY_SELECT', (event: BusEvent) => {
      const storyId = event.payload?.storyId as string;
      if (storyId) navigate(`/stories/${storyId}`);
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

  return <StoryCatalogTemplate entity={entity} />;
};

StoryCatalogPageContainer.displayName = 'StoryCatalogPageContainer';
