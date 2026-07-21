/**
 * LearningPathCard — a ConceptCard for a learning path that shows the topic's real
 * logo (devicon, e.g. the Java logo) or a representative icon (mdi/tabler) from
 * Iconify when available, falling back to the book icon otherwise. The icon is the
 * "logo of the knowledge itself".
 *
 * `imageKey` is the preferred lookup term (the path's seed concept, e.g. "TCP/IP"),
 * falling back to the path name.
 */

import React from 'react';
import { BookOpen } from 'lucide-react';
import { ConceptCard, type ConceptCardProps } from './ConceptCard/ConceptCard';
import { useConceptIcon } from '@features/knowledge-graph/hooks/useConceptIcon';

export interface LearningPathCardProps extends ConceptCardProps {
  imageKey?: string;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({ imageKey, name, icon, ...conceptProps }) => {
  const iconId = useConceptIcon(imageKey ?? name);
  return (
    <ConceptCard
      {...conceptProps}
      name={name}
      iconifyIcon={iconId ?? undefined}
      icon={!iconId ? (icon ?? BookOpen) : undefined}
    />
  );
};

LearningPathCard.displayName = 'LearningPathCard';
