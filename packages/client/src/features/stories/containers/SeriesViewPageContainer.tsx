import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import type { KFlowEvent } from '@almadar/ui';
import { SeriesViewTemplate } from '@design-system/templates/SeriesViewTemplate';
import { useSeriesDetail } from '../hooks/useSeriesDetail';

export const SeriesViewPageContainer: React.FC = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const { seriesView, isLoading } = useSeriesDetail(seriesId);
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

  useEffect(() => {
    const unsub = on('UI:EPISODE_SELECT', (event: KFlowEvent) => {
      const storyId = event.payload?.storyId as string;
      if (storyId) navigate(`/stories/${storyId}`);
    });
    return unsub;
  }, [on, navigate]);

  if (isLoading || !seriesView) {
    return <SeriesViewTemplate entity={undefined} />;
  }

  return (
    <SeriesViewTemplate
      entity={{
        ...seriesView,
        shell: { activeRoute: 'series' },
      }}
    />
  );
};

SeriesViewPageContainer.displayName = 'SeriesViewPageContainer';
