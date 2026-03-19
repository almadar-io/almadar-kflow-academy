/**
 * SeriesViewBoard Organism
 *
 * Powers the Series View page. Manages season selection state,
 * computes stats, and wires all events to child molecules.
 *
 * Events Emitted (via children):
 * - UI:EPISODE_SELECT, UI:STORY_SELECT, UI:SEASON_SELECT
 * - UI:SERIES_SUBSCRIBE, UI:SERIES_UNSUBSCRIBE
 * - UI:CREATOR_CLICK, UI:SERIES_SELECT
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Container,
  Typography,
  SimpleGrid,
  LoadingState,
  useEventBus,
  useTranslate,
  type EntityDisplayProps,
} from '@almadar/ui';
import { SeriesHeader } from '../molecules/story/SeriesHeader';
import { SeriesStatsBar } from '../molecules/story/SeriesStatsBar';
import { SeasonSelector } from '../molecules/story/SeasonSelector';
import { EpisodeCard } from '../molecules/story/EpisodeCard';
import { CreatorCard } from '../molecules/story/CreatorCard';
import { SeriesCard } from '../molecules/story/SeriesCard';
import type {
  Series,
  StorySummary,
  SeriesProgress,
  SeriesSummary,
  Season,
  Episode,
} from '../types/knowledge';

export interface SeriesViewEntity {
  series: Series;
  storyMap: Record<string, StorySummary>;
  isSubscribed: boolean;
  progress?: SeriesProgress;
  creatorOtherSeries?: SeriesSummary[];
}

export interface SeriesViewBoardProps extends EntityDisplayProps<SeriesViewEntity> {
  className?: string;
}

export function SeriesViewBoard({
  entity,
  isLoading,
  className = '',
}: SeriesViewBoardProps): React.JSX.Element {
  const { on } = useEventBus();
  const { t } = useTranslate();

  const resolved = Array.isArray(entity) ? entity[0] : (entity as SeriesViewEntity | undefined);
  const seriesSeasons = resolved?.series?.seasons ?? [];
  const currentEpisodeId = resolved?.progress?.currentEpisodeId;

  // Determine initial season: the one containing the current episode, or the first
  const initialSeasonId = useMemo(() => {
    if (currentEpisodeId) {
      const found = seriesSeasons.find((s: Season) =>
        s.episodes.some((ep: Episode) => ep.id === currentEpisodeId),
      );
      if (found) return found.id;
    }
    return seriesSeasons[0]?.id ?? '';
  }, [seriesSeasons, currentEpisodeId]);

  const [activeSeasonId, setActiveSeasonId] = useState(initialSeasonId);

  // Listen for season selection events from SeasonSelector
  useEffect(() => {
    const unsub = on('UI:SEASON_SELECT', (event) => {
      const seasonId = (event.payload as Record<string, string> | undefined)?.seasonId;
      if (seasonId) setActiveSeasonId(seasonId);
    });
    return unsub;
  }, [on]);

  const activeSeason = useMemo(
    () => seriesSeasons.find((s: Season) => s.id === activeSeasonId),
    [seriesSeasons, activeSeasonId],
  );

  // Compute aggregate stats
  const stats = useMemo(() => {
    const allEpisodes = seriesSeasons.flatMap((s: Season) => s.episodes);
    const totalStories = allEpisodes.reduce((sum: number, ep: Episode) => sum + ep.stories.length, 0);
    const totalDuration = allEpisodes.reduce((sum: number, ep: Episode) => sum + ep.duration, 0);
    const progress = resolved?.progress;
    const completionPercent = progress
      ? Math.round((progress.seasonsCompleted / progress.seasonsTotal) * 100)
      : undefined;

    return {
      totalEpisodes: allEpisodes.length,
      totalStories,
      totalDurationMinutes: totalDuration,
      averageRating: resolved?.series?.rating,
      completionPercent,
    };
  }, [seriesSeasons, resolved?.progress, resolved?.series?.rating]);

  // Resolve story titles for episode cards
  const getStoryTitles = useCallback(
    (storyIds: string[]): string[] =>
      storyIds
        .map((id) => resolved?.storyMap[id]?.title)
        .filter((title): title is string => Boolean(title)),
    [resolved?.storyMap],
  );

  if (isLoading || !resolved) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <Box className={`min-h-screen bg-[var(--color-background)] ${className}`}>
      {/* Series header with banner */}
      <SeriesHeader series={resolved.series} isSubscribed={resolved.isSubscribed} />

      <Container size="lg" padding="sm" className="py-6">
        <VStack gap="lg">
          {/* Stats bar */}
          <SeriesStatsBar
            totalEpisodes={stats.totalEpisodes}
            totalStories={stats.totalStories}
            totalDurationMinutes={stats.totalDurationMinutes}
            averageRating={stats.averageRating}
            completionPercent={stats.completionPercent}
          />

          {/* Season selector */}
          {resolved.series.seasons.length > 1 && (
            <SeasonSelector
              seasons={resolved.series.seasons}
              activeSeasonId={activeSeasonId}
              seasonProgress={resolved.progress?.seasonProgress}
            />
          )}

          {/* Episode list */}
          {activeSeason && (
            <VStack gap="md">
              <Typography variant="label" weight="bold" className="text-[var(--color-foreground)]">
                {activeSeason.title}
              </Typography>
              <Typography variant="caption" className="text-[var(--color-muted-foreground)]">
                {activeSeason.description}
              </Typography>
              <VStack gap="sm">
                {activeSeason.episodes.map((episode: Episode) => {
                  const seasonProg = resolved.progress?.seasonProgress[activeSeasonId];
                  const epProgress = seasonProg?.episodeProgress[episode.id];
                  const isCurrent = resolved.progress?.currentEpisodeId === episode.id;

                  return (
                    <Box key={episode.id} data-entity-row={episode.id}>
                    <EpisodeCard
                      episode={episode}
                      storyTitles={getStoryTitles(episode.stories)}
                      progress={epProgress}
                      isCurrentlyPlaying={isCurrent}
                    />
                    </Box>
                  );
                })}
              </VStack>
            </VStack>
          )}

          {/* Creator section */}
          {resolved.creatorOtherSeries && resolved.creatorOtherSeries.length > 0 && (
            <VStack gap="md">
              <Typography variant="small" weight="bold" className="uppercase tracking-wider text-[var(--color-muted-foreground)]">
                {t('series.moreByCreator', { name: resolved.series.creator.displayName })}
              </Typography>

              <CreatorCard
                creator={{
                  ...resolved.series.creator,
                  seriesCount: (resolved.creatorOtherSeries.length + 1),
                }}
              />

              <HStack gap="md" className="overflow-x-auto pb-2">
                <SimpleGrid minChildWidth="260px" gap="md">
                  {resolved.creatorOtherSeries.map((s: SeriesSummary) => (
                    <Box key={s.id} data-entity-row={s.id}>
                      <SeriesCard series={s} />
                    </Box>
                  ))}
                </SimpleGrid>
              </HStack>
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

SeriesViewBoard.displayName = 'SeriesViewBoard';
