/**
 * DrawerPathItem — a pinned learning-path entry in the nav drawer. Renders the
 * path's topic via the same Iconify concept-icon system as the card list
 * (tone-based contrasting circle), falling back to a Network glyph.
 */

import React from 'react';
import { Network } from 'lucide-react';
import { Icon as IconifyIcon } from '@iconify/react';
import { Button, cn } from '@almadar/ui';
import { useConceptIcon } from '@features/knowledge-graph/hooks/useConceptIcon';

export interface DrawerPathItemProps {
  label: string;
  /** Seed-concept name used to resolve the topic's Iconify logo. */
  iconLabel?: string;
  active?: boolean;
  onClick: () => void;
}

export const DrawerPathItem: React.FC<DrawerPathItemProps> = ({ label, iconLabel, active, onClick }) => {
  const icon = useConceptIcon(iconLabel);
  // Mirror ConceptCard's tone → contrasting circle background so the brand
  // icon stays visible in any theme.
  const circleClass = icon
    ? icon.tone === 'themed'
      ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
      : icon.tone === 'light'
        ? 'bg-slate-900'
        : 'bg-white'
    : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'w-full justify-start gap-3 rounded-md border-transparent px-3 py-2 text-sm font-normal text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-transparent',
        active
          ? 'bg-[var(--color-primary-muted)] font-medium text-[var(--color-foreground)]'
          : '',
      )}
    >
      <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full', circleClass)}>
        {icon ? <IconifyIcon icon={icon.icon} width={14} height={14} /> : <Network size={14} />}
      </span>
      <span className="flex-1 truncate text-start">{label}</span>
    </Button>
  );
};

DrawerPathItem.displayName = 'DrawerPathItem';
