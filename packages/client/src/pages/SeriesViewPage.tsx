import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { useEventBus } from '@almadar/ui';
import type { BusEvent } from '@almadar/core';
import { SeriesViewTemplate } from '@design-system/templates/SeriesViewTemplate';
import type { SeriesViewTemplateEntity } from '@design-system/templates/SeriesViewTemplate';
import { useSeriesDetail } from '../features/stories/hooks/useSeriesDetail';
import { useNavigateEvent } from '../hooks/useNavigateEvent';

export const SeriesViewPage: React.FC = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const { seriesView, isLoading, error } = useSeriesDetail(seriesId);
  const navigate = useNavigateEvent();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:STORY_SELECT', (event: BusEvent) => {
      const storyId = event.payload?.storyId as string;
      if (storyId) navigate(`/stories/${storyId}`);
    });
    return unsub;
  }, [on, navigate]);

  useEffect(() => {
    const unsub = on('UI:EPISODE_SELECT', (event: BusEvent) => {
      const storyId = event.payload?.storyId as string;
      if (storyId) navigate(`/stories/${storyId}`);
    });
    return unsub;
  }, [on, navigate]);

  const uiError = error ? { message: error } : null;

  const entity: SeriesViewTemplateEntity | undefined = seriesView
    ? { ...seriesView, shell: { activeRoute: 'series' as const } }
    : undefined;

  return (
    <SeriesViewTemplate
      entity={entity}
      isLoading={isLoading}
      error={uiError}
    />
  );
};

SeriesViewPage.displayName = 'SeriesViewPage';
