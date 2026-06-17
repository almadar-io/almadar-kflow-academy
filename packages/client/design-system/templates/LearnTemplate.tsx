/**
 * LearnTemplate
 *
 * Pure template wrapping LearnBoard inside AppShellTemplate.
 * No hooks, no state - passes entity fields through.
 *
 * Accepts either a LearnTemplateEntity (direct use) or an array of
 * graph-like objects from the orbital compiler (Graph[]).
 *
 * Events Emitted (via LearnBoard + AppShellBoard):
 * - UI:LEARNING_PATH_CLICK, UI:CREATE_LEARNING_PATH, UI:DELETE_LEARNING_PATH
 * - UI:NAV_CLICK, UI:TOGGLE_SIDEBAR, UI:TOGGLE_THEME, UI:SIGN_OUT
 */

import React from 'react';
import { AppShellTemplate } from './AppShellTemplate';
import type { AppShellEntity } from './AppShellTemplate';
import { LearnBoard } from '../organisms/LearnBoard';
import type { LearnEntity, LearnPathItem } from '../organisms/LearnBoard';

export type { LearnEntity, LearnPathItem } from '../organisms/LearnBoard';

export interface LearnTemplateEntity extends LearnEntity {
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

export interface LearnTemplateProps {
  entity: LearnTemplateEntity | GraphLike[];
  className?: string;
}

export function LearnTemplate({
  entity,
  className,
}: LearnTemplateProps): React.JSX.Element {
  const isArray = Array.isArray(entity);

  const learnEntity: LearnEntity = isArray
    ? {
        learningPaths: (entity as GraphLike[]).map((g): LearnPathItem => ({
          id: g.id,
          graphId: g.id,
          name: g.name,
          seedConcept: g.seedConcept ?? '',
          conceptCount: g.conceptCount ?? 0,
          levelCount: g.levelCount ?? 0,
          description: g.description,
        })),
        loading: false,
      }
    : (entity as LearnTemplateEntity);

  const shell = isArray ? undefined : (entity as LearnTemplateEntity).shell;

  return (
    <AppShellTemplate entity={shell} appName="KFlow" navItems={KFLOW_NAV_ITEMS}>
      <LearnBoard entity={learnEntity} className={className} />
    </AppShellTemplate>
  );
}

LearnTemplate.displayName = 'LearnTemplate';
