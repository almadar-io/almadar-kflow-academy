/**
 * LearnPathsTemplate
 *
 * Pure entity-based template: AppShellTemplate + LearnBoard.
 * No hooks, no callbacks, no local state.
 *
 * Events (emitted by LearnBoard):
 * - UI:LEARNING_PATH_CLICK  payload: { pathId, graphId }
 * - UI:CREATE_LEARNING_PATH
 * - UI:DELETE_LEARNING_PATH  payload: { pathId }
 * - UI:NAV_CLICK             payload: { href }
 */

import React from 'react';
import { AppShellTemplate } from '../AppShellTemplate';
import type { AppShellEntity } from '../AppShellTemplate';
import { LearnBoard } from '../../organisms/LearnBoard';
import type { LearnEntity } from '../../organisms/LearnBoard';
import type { DisplayStateProps } from '@almadar/ui';

export type { LearnEntity, LearnPathItem } from '../../organisms/LearnBoard';

export interface LearnPathsTemplateEntity {
  shell: AppShellEntity;
  learn: LearnEntity;
}

export interface LearnPathsTemplateProps extends DisplayStateProps {
  entity: LearnPathsTemplateEntity;
  /** Overlay content (e.g. goal-form dialog) — rendered after board */
  overlay?: React.ReactNode;
}

export function LearnPathsTemplate({
  entity,
  isLoading,
  error,
  className,
  overlay,
}: LearnPathsTemplateProps): React.JSX.Element {
  return (
    <AppShellTemplate entity={entity.shell} className={className}>
      <LearnBoard entity={entity.learn} isLoading={isLoading} error={error} />
      {overlay}
    </AppShellTemplate>
  );
}

LearnPathsTemplate.displayName = 'LearnPathsTemplate';
