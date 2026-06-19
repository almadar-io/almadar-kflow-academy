/**
 * SeriesViewTemplate
 *
 * Pure template wrapping SeriesViewBoard inside StoriesShellTemplate.
 * No hooks, no state - passes entity fields through to child organisms.
 */

import React from 'react';
import { StoriesShellTemplate } from './StoriesShellTemplate';
import { SeriesViewBoard } from '../organisms/SeriesViewBoard';
import type { SeriesViewEntity } from '../organisms/SeriesViewBoard';
import { LoadingState, type DisplayStateProps } from '@almadar/ui';
import type { StoriesNavUser } from '../molecules/StoriesNavHeader';
import type { KnowledgeDomainType, SeriesStatus, Season } from '../types/knowledge';

export interface SeriesViewTemplateEntity extends SeriesViewEntity {
  shell: { activeRoute: 'series'; user?: StoriesNavUser };
}

/** Minimal series record shape emitted by the orbital compiler */
interface SeriesRecordLike {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  domain?: string;
  tags?: string[];
  coverImage?: string;
  seasons?: Season[];
  status?: string;
  subscriberCount?: number;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeriesViewTemplateProps extends DisplayStateProps {
  entity?: SeriesViewTemplateEntity | SeriesRecordLike[] | unknown[];
}

export function SeriesViewTemplate({
  entity,
  isLoading,
  error,
  className,
}: SeriesViewTemplateProps): React.JSX.Element | null {
  if (isLoading && !entity) return <LoadingState />;
  if (!entity) return null;
  const resolved: SeriesViewTemplateEntity = Array.isArray(entity)
    ? (() => {
        const s = (entity as SeriesRecordLike[])[0] ?? {
          id: '',
          title: '',
          creatorId: '',
          creatorName: '',
        };
        return {
          series: {
            id: s.id,
            title: s.title,
            description: s.description ?? '',
            creator: {
              uid: s.creatorId,
              displayName: s.creatorName,
              avatar: s.creatorAvatar,
            },
            domain: (s.domain ?? 'formal') as KnowledgeDomainType,
            tags: s.tags ?? [],
            coverImage: s.coverImage,
            seasons: [],
            status: (s.status ?? 'published') as SeriesStatus,
            subscriberCount: s.subscriberCount ?? 0,
            rating: s.rating,
            createdAt: s.createdAt ?? new Date().toISOString(),
            updatedAt: s.updatedAt ?? new Date().toISOString(),
          },
          storyMap: {},
          isSubscribed: false,
          shell: { activeRoute: 'series' as const },
        };
      })()
    : (entity as SeriesViewTemplateEntity);

  if (!resolved.series?.id) return null;

  return (
    <StoriesShellTemplate entity={resolved.shell}>
      <SeriesViewBoard entity={resolved} isLoading={isLoading} error={error} className={className} />
    </StoriesShellTemplate>
  );
}

SeriesViewTemplate.displayName = 'SeriesViewTemplate';
