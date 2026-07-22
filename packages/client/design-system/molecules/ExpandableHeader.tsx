import React, { useState } from 'react';
import { Typography } from '@almadar/ui';
import { ChevronDown } from 'lucide-react';
import { cn } from '@utils/theme';

export interface ExpandableHeaderProps {
  /** Always-visible title. */
  title: React.ReactNode;
  /** Collapsible content (description, etc.). */
  description?: React.ReactNode;
  /** Optional badges/labels rendered next to the title. */
  badges?: React.ReactNode;
  /** Optional actions rendered to the right of the title (after the chevron). */
  actions?: React.ReactNode;
  /** Start expanded (default: true). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * A title + collapsible description header. The title stays visible; the
 * description (and any trailing children) collapses to reclaim reading space.
 * Used for the concept-detail name header (G10).
 */
export const ExpandableHeader: React.FC<ExpandableHeaderProps> = ({
  title,
  description,
  badges,
  actions,
  defaultOpen = true,
  className,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetail = Boolean(description);

  return (
    <div className={cn('text-center', className)}>
      <div className="flex items-center justify-center gap-3 mb-2">
        {badges}
        <Typography variant="h1" className="text-3xl sm:text-4xl font-bold">
          {title}
        </Typography>
        {hasDetail && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-full text-muted-foreground hover:bg-surface-hover transition-colors"
            aria-label={open ? 'Collapse' : 'Expand'}
            aria-expanded={open}
          >
            <ChevronDown
              size={20}
              className={cn('transition-transform duration-normal', open && 'rotate-180')}
            />
          </button>
        )}
        {actions && <div className="flex items-center">{actions}</div>}
      </div>
      {hasDetail && open && (
        <Typography
          variant="body"
          color="muted"
          className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed animate-slide-up"
        >
          {description}
        </Typography>
      )}
    </div>
  );
};

ExpandableHeader.displayName = 'ExpandableHeader';
