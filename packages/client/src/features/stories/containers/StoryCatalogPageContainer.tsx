import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import type { KFlowEvent } from '@almadar/ui';
import { StoryCatalogTemplate } from '@design-system/templates/StoryCatalogTemplate';
import { useStories } from '../hooks/useStories';
import { useSeriesList } from '../hooks/useSeries';
import type { StoryCatalogEntity } from '@design-system/organisms/StoryCatalogBoard';

export const StoryCatalogPageContainer: React.FC = () => {
  const { stories } = useStories();
  const { series } = useSeriesList();
  // eslint-disable-next-line almadar/no-use-navigate
  const navigate = useNavigate();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:STORY_SELECT', (event: KFlowEvent) => {
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
