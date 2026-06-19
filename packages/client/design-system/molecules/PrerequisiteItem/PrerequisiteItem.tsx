/**
 * PrerequisiteItem Molecule Component
 * 
 * Displays a single prerequisite item with status (existing/missing) and actions.
 * Uses Badge and Button atoms.
 */

import React from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Badge, Button, Typography } from '@almadar/ui';

export interface PrerequisiteItemProps {
  /**
   * Prerequisite name
   */
  name: string;
  
  /**
   * Whether prerequisite is missing
   * @default false
   */
  isMissing?: boolean;
  
  /**
   * Optional description
   */
  description?: string;
  
  /**
   * Display variant
   * @default 'detail'
   */
  variant?: 'list' | 'detail';
  
  /**
   * Callback when viewing prerequisite
   */
  onView?: (name: string) => void;
  
  /**
   * Callback when adding prerequisite
   */
  onAdd?: (name: string) => void;
  
  /**
   * Callback when removing prerequisite
   */
  onRemove?: (name: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const PrerequisiteItem: React.FC<PrerequisiteItemProps> = ({
  name,
  isMissing = false,
  description,
  variant = 'detail',
  onView,
  onAdd,
  onRemove,
  className = '',
}) => {
  const isList = variant === 'list';

  const containerClasses = isMissing
    ? isList
      ? 'group relative flex items-center justify-between gap-3 p-3 rounded-lg shadow-sm hover:shadow-md transition-all bg-surface border border-warning hover:border-warning'
      : 'flex items-center justify-between gap-3 bg-card rounded-lg p-3 border border-warning shadow-sm hover:shadow-md transition-shadow'
    : isList
      ? 'group relative flex items-center justify-between gap-3 p-3 rounded-lg shadow-sm hover:shadow-md transition-all bg-surface border border-success hover:border-success'
      : 'flex items-center justify-between gap-3 bg-card rounded-lg p-3 border border-success shadow-sm hover:shadow-md transition-shadow';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {!isMissing && (
          <Check className="h-4 w-4 text-success flex-shrink-0" />
        )}
        {isMissing && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isMissing ? 'warning' : 'success'} 
              size="sm"
              className="text-xs"
            >
              {isMissing ? 'Missing:' : 'Prerequisite:'}
            </Badge>
            {onView ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(name)}
                className="text-sm font-semibold text-primary hover:underline truncate p-0 h-auto"
                title={`View ${name}`}
              >
                {name}
              </Button>
            ) : (
              <Typography variant="small" className="font-semibold truncate">
                {name}
              </Typography>
            )}
          </div>
          {description && (
            <Typography variant="small" className="mt-1 text-muted-foreground line-clamp-2">
              {description}
            </Typography>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isMissing && onAdd && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAdd(name)}
            icon={Plus}
            className="text-warning hover:bg-surface-hover"
            aria-label="Add prerequisite"
          >
            <span className="sr-only">Add prerequisite</span>
          </Button>
        )}
        {isMissing && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(name)}
            icon={X}
            className="text-error hover:bg-surface-hover"
            aria-label="Remove prerequisite"
          >
            <span className="sr-only">Remove prerequisite</span>
          </Button>
        )}
      </div>
    </div>
  );
};

PrerequisiteItem.displayName = 'PrerequisiteItem';
