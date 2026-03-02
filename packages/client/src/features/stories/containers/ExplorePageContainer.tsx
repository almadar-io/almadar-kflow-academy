import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import { StoriesShellTemplate } from '@design-system/templates/StoriesShellTemplate';
import { StoryCatalogTemplate } from '@design-system/templates/StoryCatalogTemplate';
import { useStories } from '../hooks/useStories';
import { useSeriesList } from '../hooks/useSeries';
import type { StoryCatalogEntity } from '@design-system/organisms/StoryCatalogBoard';

/**
 * Explore page: shows all stories and series with domain-based browsing.
 * Reuses StoryCatalogTemplate with explore-focused layout.
 */
export const ExplorePageContainer: React.FC = () => {
  const { stories, isLoading: isLoadingStories } = useStories();
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

  const entity: StoryCatalogEntity = {
    stories,
    domains: ['formal', 'natural', 'social'],
    series,
  };

  return (
    <StoriesShellTemplate entity={{ activeRoute: 'explore' }}>
      <StoryCatalogTemplate entity={entity} isLoading={isLoadingStories || isLoadingSeries} />
    </StoriesShellTemplate>
  );
};

ExplorePageContainer.displayName = 'ExplorePageContainer';
