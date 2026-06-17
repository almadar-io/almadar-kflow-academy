/**
 * StoryCard Molecule
 *
 * Card for displaying a story summary in the catalog.
 * Shows title, teaser, domain badge, duration, difficulty, play count.
 *
 * Event Contract:
 * - No events emitted (callback passed from organism)
 * - entityAware: false
 */

import React from 'react';
import {
  Card,
  VStack,
  HStack,
  Typography,
  Badge,
  Icon,
  useEventBus,
  useTranslate,
} from '@almadar/ui';
import { Clock, Users, Star, Library } from 'lucide-react';
import { DomainBadge } from '../../atoms/DomainBadge';
import type { KnowledgeDomainType, StorySummary } from '../../types/knowledge';

export type { StorySummary } from '../../types/knowledge';

export interface StoryCardProps {
  story: StorySummary;
  onClick?: (storyId: string) => void;
  className?: string;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onClick,
  className,
}) => {
  const { emit } = useEventBus();
  const { t } = useTranslate();

  const handleSeriesBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (story.seriesId) {
      emit('UI:SERIES_SELECT', { seriesId: story.seriesId });
    }
  };

  return (
    <Card
      className={`p-5 cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all ${className ?? ''}`}
      onClick={() => onClick?.(story.id)}
    >
      <VStack gap="sm">
        {story.coverImage && (
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-32 object-cover rounded-lg"
          />
        )}

        <Typography variant="body" weight="bold" className="text-gray-900 dark:text-white">
          {story.title}
        </Typography>

        <Typography variant="caption" className="text-gray-500 dark:text-gray-400 line-clamp-2">
          {story.teaser}
        </Typography>

        <HStack gap="md" align="center" className="mt-2">
          <HStack gap="xs" align="center">
            <Icon icon={Clock} size="xs" className="text-gray-400 dark:text-gray-500" />
            <Typography variant="caption" className="text-gray-500 dark:text-gray-400">
              {t('story.duration', { minutes: String(story.duration) })}
            </Typography>
          </HStack>

          {story.rating !== undefined && (
            <HStack gap="xs" align="center">
              <Icon icon={Star} size="xs" className="text-yellow-500" />
              <Typography variant="caption" className="text-gray-500 dark:text-gray-400">
                {story.rating.toFixed(1)}
              </Typography>
            </HStack>
          )}

          {story.playCount !== undefined && (
            <HStack gap="xs" align="center">
              <Icon icon={Users} size="xs" className="text-gray-400 dark:text-gray-500" />
              <Typography variant="caption" className="text-gray-500 dark:text-gray-400">
                {story.playCount.toLocaleString()}
              </Typography>
            </HStack>
          )}
        </HStack>

        <HStack gap="xs" align="center" className="mt-1">
          <DomainBadge domain={story.domain as KnowledgeDomainType} size="sm" />
          <Badge size="sm">{t(`story.difficulty.${story.difficulty}`)}</Badge>
          {story.seriesId && (
            <Badge
              size="sm"
              variant="secondary"
              className="cursor-pointer"
              onClick={handleSeriesBadgeClick}
            >
              <Icon icon={Library} size="xs" />
              {t('story.series')}
            </Badge>
          )}
        </HStack>
      </VStack>
    </Card>
  );
};

StoryCard.displayName = 'StoryCard';
