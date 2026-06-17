/**
 * DashboardTemplate
 *
 * Pure template wrapping DashboardBoard inside AppShellTemplate.
 * No hooks, no state - passes entity fields through.
 *
 * Accepts either a DashboardTemplateEntity (direct use) or an array of
 * graph-like objects from the orbital compiler (Graph[]).
 *
 * Events Emitted (via DashboardBoard + AppShellBoard):
 * - UI:QUICK_ACTION, UI:ACTIVITY_CLICK, UI:LEARNING_PATH_CLICK
 * - UI:CREATE_LEARNING_PATH, UI:DELETE_LEARNING_PATH
 * - UI:STORY_SELECT (via JumpBackInRow)
 * - UI:NAV_CLICK, UI:TOGGLE_SIDEBAR, UI:TOGGLE_THEME, UI:SIGN_OUT
 */

import React from 'react';
import { AppShellTemplate } from './AppShellTemplate';
import type { AppShellEntity } from './AppShellTemplate';
import { DashboardBoard } from '../organisms/DashboardBoard';
import type { DashboardEntity, DashboardLearningPath } from '../organisms/DashboardBoard';

export type { DashboardEntity, DashboardStat, DashboardActivity, DashboardLearningPath, DashboardQuickAction } from '../organisms/DashboardBoard';

export interface DashboardTemplateEntity extends DashboardEntity {
  shell: AppShellEntity;
}

/** Minimal graph shape emitted by the orbital compiler */
interface GraphLike {
  id: string;
  name: string;
  seedConcept?: string;
  conceptCount?: number;
  levelCount?: number;
  description?: string;
}

const KFLOW_NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/learn', label: 'Learn' },
  { href: '/stories', label: 'Stories' },
  { href: '/explore', label: 'Explore' },
];

export interface DashboardTemplateProps {
  entity: DashboardTemplateEntity | GraphLike[];
  className?: string;
}

export function DashboardTemplate({
  entity,
  className,
}: DashboardTemplateProps): React.JSX.Element {
  const isArray = Array.isArray(entity);

  const dashEntity: DashboardEntity = isArray
    ? {
        welcomeName: 'Learner',
        stats: [],
        jumpBackInStories: [],
        recentActivity: [],
        learningPaths: (entity as GraphLike[]).map((g): DashboardLearningPath => ({
          id: g.id,
          graphId: g.id,
          name: g.name,
          seedConcept: g.seedConcept ?? '',
          conceptCount: g.conceptCount ?? 0,
          levelCount: g.levelCount ?? 0,
          description: g.description,
        })),
        quickActions: [],
      }
    : (entity as DashboardTemplateEntity);

  const shell = isArray ? undefined : (entity as DashboardTemplateEntity).shell;

  return (
    <AppShellTemplate entity={shell} appName="KFlow" navItems={KFLOW_NAV_ITEMS}>
      <DashboardBoard entity={dashEntity} className={className} />
    </AppShellTemplate>
  );
}

DashboardTemplate.displayName = 'DashboardTemplate';
