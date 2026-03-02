import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import { SeriesViewTemplate } from '@design-system/templates/SeriesViewTemplate';
import { useSeriesDetail } from '../hooks/useSeriesDetail';

export const SeriesViewPageContainer: React.FC = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const { seriesView, isLoading, error } = useSeriesDetail(seriesId);
  // eslint-disable-next-line almadar/no-use-navigate
  const navigate = useNavigate();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:STORY_SELECT', (payload: { storyId: string }) => {
      navigate(`/stories/${payload.storyId}`);
    });
    return unsub;
  }, [on, navigate]);

  useEffect(() => {
    const unsub = on('UI:EPISODE_SELECT', (payload: { episodeId: string; storyId?: string }) => {
      if (payload.storyId) {
        navigate(`/stories/${payload.storyId}`);
      }
    });
    return unsub;
  }, [on, navigate]);

  if (isLoading || !seriesView) {
    return <SeriesViewTemplate entity={null} isLoading={true} />;
  }

  if (error) {
    return <SeriesViewTemplate entity={null} error={error} />;
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
