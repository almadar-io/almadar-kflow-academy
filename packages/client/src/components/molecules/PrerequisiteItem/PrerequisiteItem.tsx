/**
 * PrerequisiteItem Molecule Component
 * 
 * Displays a single prerequisite item with status (existing/missing) and actions.
 * Uses Badge and Button atoms.
 */

import React from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';

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
      ? 'group relative flex items-center justify-between gap-3 p-3 rounded-lg shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600'
      : 'flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow'
    : isList
      ? 'group relative flex items-center justify-between gap-3 p-3 rounded-lg shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600'
      : 'flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {!isMissing && (
          <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
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
                variant="link"
                size="sm"
                onClick={() => onView(name)}
                className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline truncate p-0 h-auto"
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
            <Typography variant="small" className="mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">
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
            className="text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
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
            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
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
