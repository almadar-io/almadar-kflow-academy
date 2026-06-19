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
import { LoadingState, type DisplayStateProps } from '@almadar/ui';

export type { KnowledgeStoryEntity } from '../organisms/KnowledgeStoryBoard';

export interface KnowledgeStoryTemplateProps extends DisplayStateProps {
  entity?: KnowledgeStoryEntity | KnowledgeStoryEntity[] | unknown[];
}

export const KnowledgeStoryTemplate = ({
  entity,
  isLoading,
  error,
  className,
}: KnowledgeStoryTemplateProps) => {
  const resolved = (Array.isArray(entity) ? entity[0] : entity) as KnowledgeStoryEntity | undefined;
  if (isLoading && !resolved) return <LoadingState />;
  if (!resolved) return null;
  return <KnowledgeStoryBoard entity={resolved} isLoading={isLoading} error={error} className={className} />;
};

KnowledgeStoryTemplate.displayName = 'KnowledgeStoryTemplate';
