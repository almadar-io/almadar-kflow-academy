/**
 * StoryCatalogTemplate - Browse and discover Knowledge Stories.
 *
 * Pure declarative wrapper for StoryCatalogBoard organism.
 * No hooks, no callbacks, no local state.
 *
 * Accepts either a StoryCatalogEntity (direct use) or an array of
 * story-like objects from the orbital compiler (Story[]).
 */

import React from 'react';
import { StoryCatalogBoard } from '../organisms/StoryCatalogBoard';
import type { StoryCatalogEntity } from '../organisms/StoryCatalogBoard';
import type { StorySummary } from '../types/knowledge';

export type { StoryCatalogEntity } from '../organisms/StoryCatalogBoard';

/** Minimal story shape emitted by the orbital compiler */
interface StoryLike {
  id: string;
  title: string;
  teaser?: string;
  domain?: string;
  difficulty?: string;
  duration?: number;
  coverImage?: string;
  rating?: number;
  playCount?: number;
  seriesId?: string;
  episodeId?: string;
}

export interface StoryCatalogTemplateProps {
  entity: StoryCatalogEntity | StoryLike[];
  className?: string;
}

export const StoryCatalogTemplate = ({
  entity,
  className,
}: StoryCatalogTemplateProps) => {
  const resolvedEntity: StoryCatalogEntity = Array.isArray(entity)
    ? {
        stories: (entity as StoryLike[]).map((s): StorySummary => ({
          id: s.id,
          title: s.title,
          teaser: s.teaser ?? '',
          domain: s.domain ?? '',
          difficulty: s.difficulty ?? 'beginner',
          duration: s.duration ?? 5,
          coverImage: s.coverImage,
          rating: s.rating,
          playCount: s.playCount,
          seriesId: s.seriesId,
          episodeId: s.episodeId,
        })),
        domains: [...new Set((entity as StoryLike[]).map(s => s.domain).filter((d): d is string => typeof d === 'string'))],
      }
    : (entity as StoryCatalogEntity);

  return <StoryCatalogBoard entity={resolvedEntity} className={className} />;
};

StoryCatalogTemplate.displayName = 'StoryCatalogTemplate';
