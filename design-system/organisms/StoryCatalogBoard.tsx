/**
 * StoryCatalogBoard Organism
 *
 * Displays a browsable catalog of Knowledge Stories with domain
 * filtering, a featured story, and a grid of story cards.
 *
 * Events Emitted:
 * - UI:STORY_SELECT — user clicks a story card
 * - UI:STORY_DOMAIN_FILTER — user changes domain filter
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Typography,
  Tabs,
  SimpleGrid,
  LoadingState,
  useEventBus,
  useTranslate,
  type EntityDisplayProps,
} from '@almadar/ui';
import { StoryCard } from '../molecules/story/StoryCard';
import { SeriesCard } from '../molecules/story/SeriesCard';
import type { StorySummary } from '../molecules/story/StoryCard';
import type { SeriesSummary } from '../types/knowledge';

export interface StoryCatalogEntity {
  stories: StorySummary[];
  featuredStory?: StorySummary;
  selectedDomain?: string;
  domains: string[];
  series?: SeriesSummary[];
}

export interface StoryCatalogBoardProps extends EntityDisplayProps<StoryCatalogEntity> {
  // no additional props beyond EntityDisplayProps
}

export function StoryCatalogBoard({
  entity,
  isLoading,
  className = '',
}: StoryCatalogBoardProps): React.JSX.Element {
  const { emit } = useEventBus();
  const { t } = useTranslate();

  // ---------------------------------------------------------------------------
  // Resolve entity — runtime may pass an array or undefined while loading
  // ---------------------------------------------------------------------------
  const resolved = Array.isArray(entity) ? entity[0] : (entity as StoryCatalogEntity | undefined);
  const selectedDomain = resolved?.selectedDomain;

  // ---------------------------------------------------------------------------
  // All hooks must be unconditional — declared before any early return
  // ---------------------------------------------------------------------------
  const [activeDomain, setActiveDomain] = useState(selectedDomain ?? 'all');

  const handleStoryClick = useCallback((storyId: string) => {
    emit('UI:STORY_SELECT', { storyId });
  }, [emit]);

  const handleDomainChange = useCallback((domain: string) => {
    setActiveDomain(domain);
    emit('UI:STORY_DOMAIN_FILTER', { domain });
  }, [emit]);

  const filteredStories = useMemo(() => {
    const stories = resolved?.stories ?? [];
    if (activeDomain === 'all') return stories;
    return stories.filter((s: StorySummary) => s.domain === activeDomain);
  }, [resolved?.stories, activeDomain]);

  const hasSeries = (resolved?.series?.length ?? 0) > 0;
  const isSeriesTab = activeDomain === 'series';

  const domainTabs = useMemo(() => [
    { id: 'all', label: t('catalog.all') },
    ...(resolved?.domains ?? []).map((d: string) => ({
      id: d,
      label: t(`story.domain.${d}`),
    })),
    ...(hasSeries ? [{ id: 'series', label: t('catalog.series') }] : []),
  ], [resolved?.domains, hasSeries, t]);

  // -------------------------------------------------------------------------
  // Early return after all hooks
  // -------------------------------------------------------------------------
  if (isLoading || !resolved) {
    return <LoadingState message="Loading catalog..." />;
  }

  return (
    <Box className={className}>
      <VStack gap="sm" className="mb-6">
        <Typography variant="h1" weight="bold" className="text-gray-900 dark:text-white">
          {t('catalog.title')}
        </Typography>
        <Typography variant="body" className="text-gray-500 dark:text-gray-400">
          {t('catalog.subtitle')}
        </Typography>
      </VStack>

      <VStack gap="lg">
        <VStack gap="lg">
          {/* Featured story */}
          {resolved.featuredStory && (
            <VStack gap="sm">
              <Typography variant="small" weight="bold" className="uppercase tracking-wider text-[var(--color-muted-foreground)]">
                {t('catalog.featured')}
              </Typography>
              <StoryCard
                story={resolved.featuredStory}
                onClick={handleStoryClick}
              />
            </VStack>
          )}

          {/* Domain filter tabs */}
          <Tabs
            items={domainTabs}
            activeTab={activeDomain}
            onTabChange={handleDomainChange}
          />

          {/* Content grid */}
          {isSeriesTab ? (
            <SimpleGrid minChildWidth="280px" gap="md">
              {resolved.series?.map((s: SeriesSummary) => (
                <Box key={s.id} data-entity-row={s.id}>
                  <SeriesCard series={s} />
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <>
              <SimpleGrid minChildWidth="280px" gap="md">
                {filteredStories.map((story: StorySummary) => (
                  <Box key={story.id} data-entity-row={story.id}>
                    <StoryCard
                      story={story}
                      onClick={handleStoryClick}
                    />
                  </Box>
                ))}
              </SimpleGrid>

              {filteredStories.length === 0 && (
                <Typography variant="body" className="text-center text-[var(--color-muted-foreground)] py-8">
                  {t('catalog.noStories')}
                </Typography>
              )}
            </>
          )}
        </VStack>
      </VStack>
    </Box>
  );
}

StoryCatalogBoard.displayName = 'StoryCatalogBoard';
