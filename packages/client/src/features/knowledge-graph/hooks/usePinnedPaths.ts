/**
 * usePinnedPaths — the user's most-recent learning paths, shaped for the nav
 * drawer's pinned section. Universal: rendered in the drawer on every page
 * (Home, concept detail, settings, …) so pinned paths are always one click
 * away. Shares the react-query cache with useLearningPaths — no extra fetch.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { useTranslate } from '@almadar/ui';
import { useLearningPaths } from './useLearningPaths';

export interface PinnedPath {
  id: string;
  label: string;
  /** Seed-concept name — used to resolve the topic's Iconify logo. */
  iconLabel?: string;
  href: string;
  active: boolean;
}

export function usePinnedPaths(limit = 5): PinnedPath[] {
  const { learningPaths } = useLearningPaths();
  const { pathname } = useLocation();
  const { t } = useTranslate();

  return useMemo(
    () =>
      learningPaths.slice(0, limit).map((p) => ({
        id: p.id,
        label: p.title || p.seedConcept?.name || t('dashboard.untitledPath'),
        iconLabel: p.seedConcept?.name,
        href: `/concepts/${p.id}`,
        active: pathname === `/concepts/${p.id}`,
      })),
    [learningPaths, limit, pathname, t],
  );
}
