/**
 * KnowledgeStoryTemplate - Five-step Knowledge Story wizard.
 *
 * Pure declarative wrapper for KnowledgeStoryBoard organism.
 * No hooks, no callbacks, no local state.
 *
 * Accepts either a KnowledgeStoryEntity (direct use) or an array
 * from the orbital compiler — takes the first element in that case.
 */

import React from 'react';
import { KnowledgeStoryBoard } from '../organisms/KnowledgeStoryBoard';
import type { KnowledgeStoryEntity } from '../organisms/KnowledgeStoryBoard';

export type { KnowledgeStoryEntity } from '../organisms/KnowledgeStoryBoard';

export interface KnowledgeStoryTemplateProps {
  entity?: KnowledgeStoryEntity | KnowledgeStoryEntity[] | unknown[];
  className?: string;
}

export const KnowledgeStoryTemplate = ({
  entity,
  className,
}: KnowledgeStoryTemplateProps) => {
  const resolved = (Array.isArray(entity) ? entity[0] : entity) as KnowledgeStoryEntity | undefined;
  if (!resolved) return null;
  return <KnowledgeStoryBoard entity={resolved} className={className} />;
};

KnowledgeStoryTemplate.displayName = 'KnowledgeStoryTemplate';
