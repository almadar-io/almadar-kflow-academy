/**
 * DashboardBoardTemplate
 *
 * Pure entity-based template: AppShellTemplate + DashboardBoard.
 * No hooks, no callbacks, no local state.
 *
 * Events (emitted by DashboardBoard):
 * - UI:QUICK_ACTION       payload: { actionId }
 * - UI:ACTIVITY_CLICK     payload: { activityId, type }
 * - UI:LEARNING_PATH_CLICK payload: { pathId, graphId }
 * - UI:CREATE_LEARNING_PATH
 * - UI:DELETE_LEARNING_PATH payload: { pathId }
 * - UI:NAV_CLICK          payload: { href }
 */

import React from 'react';
import { AppShellTemplate } from '../AppShellTemplate';
import type { AppShellEntity } from '../AppShellTemplate';
import { DashboardBoard } from '../../organisms/DashboardBoard';
import type { DashboardEntity, DashboardMapLevel } from '../../organisms/DashboardBoard';
import type { DisplayStateProps } from '@almadar/ui';

export type { DashboardEntity } from '../../organisms/DashboardBoard';

export interface DashboardBoardTemplateEntity {
  shell: AppShellEntity;
  dashboard: DashboardEntity;
  /** Hero knowledge-map level: L1 = paths, L2 = drilled concepts. Default L1. */
  mapLevel?: DashboardMapLevel;
  /** True while the current map level's data is loading — shows a loader in the map area. */
  mapLoading?: boolean;
  /** The path currently being deleted — shows a loading overlay on its card. */
  deletingPathId?: string | null;
}

export interface DashboardBoardTemplateProps extends DisplayStateProps {
  entity: DashboardBoardTemplateEntity;
}

export function DashboardBoardTemplate({
  entity,
  isLoading,
  error,
  className,
}: DashboardBoardTemplateProps): React.JSX.Element {
  return (
    <AppShellTemplate entity={entity.shell} className={className}>
      <DashboardBoard entity={entity.dashboard} level={entity.mapLevel} mapLoading={entity.mapLoading} deletingPathId={entity.deletingPathId} isLoading={isLoading} error={error} />
    </AppShellTemplate>
  );
}

DashboardBoardTemplate.displayName = 'DashboardBoardTemplate';
