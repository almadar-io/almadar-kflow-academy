/**
 * BulkActionBar Organism Component
 * 
 * A floating action bar for multi-select operations.
 * Shows selected count and available bulk actions.
 */

import React from 'react';
import { 
  X, 
  Trash2, 
  Copy, 
  Download, 
  Upload,
  Globe,
  Lock,
  Eye,
  EyeOff,
  FolderOpen,
  Tags,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Checkbox } from '../../atoms/Checkbox';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface BulkAction {
  /**
   * Action ID
   */
  id: string;
  
  /**
   * Action label
   */
  label: string;
  
  /**
   * Action icon
   */
  icon: LucideIcon;
  
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  
  /**
   * Whether action is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether action is loading
   */
  loading?: boolean;
  
  /**
   * Action handler
   */
  onClick: () => void;
}

export interface BulkActionBarProps {
  /**
   * Number of selected items
   */
  selectedCount: number;
  
  /**
   * Total number of items
   */
  totalCount?: number;
  
  /**
   * Type of items (e.g., "concepts", "lessons")
   */
  itemType?: string;
  
  /**
   * Whether all items are selected
   */
  allSelected?: boolean;
  
  /**
   * Available actions
   */
  actions?: BulkAction[];
  
  /**
   * Callback to select all items
   */
  onSelectAll?: () => void;
  
  /**
   * Callback to clear selection
   */
  onClearSelection?: () => void;
  
  /**
   * Position of the bar
   * @default 'bottom'
   */
  position?: 'top' | 'bottom';
  
  /**
   * Whether the bar is fixed
   * @default true
   */
  fixed?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Common action presets
export const createPublishAction = (onClick: () => void, loading = false): BulkAction => ({
  id: 'publish',
  label: 'Publish',
  icon: Globe,
  variant: 'primary',
  loading,
  onClick,
});

export const createUnpublishAction = (onClick: () => void, loading = false): BulkAction => ({
  id: 'unpublish',
  label: 'Unpublish',
  icon: EyeOff,
  variant: 'secondary',
  loading,
  onClick,
});

export const createDeleteAction = (onClick: () => void, loading = false): BulkAction => ({
  id: 'delete',
  label: 'Delete',
  icon: Trash2,
  variant: 'danger',
  loading,
  onClick,
});

export const createDuplicateAction = (onClick: () => void, loading = false): BulkAction => ({
  id: 'duplicate',
  label: 'Duplicate',
  icon: Copy,
  variant: 'secondary',
  loading,
  onClick,
});

export const createExportAction = (onClick: () => void, loading = false): BulkAction => ({
  id: 'export',
  label: 'Export',
  icon: Download,
  variant: 'secondary',
  loading,
  onClick,
});

export const createMoveAction = (onClick: () => void, loading = false): BulkAction => ({
  id: 'move',
  label: 'Move',
  icon: FolderOpen,
  variant: 'secondary',
  loading,
  onClick,
});

export const createTagAction = (onClick: () => void, loading = false): BulkAction => ({
  id: 'tag',
  label: 'Tag',
  icon: Tags,
  variant: 'secondary',
  loading,
  onClick,
});

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  itemType = 'items',
  allSelected = false,
  actions = [],
  onSelectAll,
  onClearSelection,
  position = 'bottom',
  fixed = true,
  className,
}) => {
  if (selectedCount === 0) return null;
  
  const positionClasses = {
    top: 'top-4',
    bottom: 'bottom-4',
  };
  
  return (
    <div
      className={cn(
        'left-1/2 -translate-x-1/2 z-50',
        fixed ? 'fixed' : 'absolute',
        positionClasses[position],
        className
      )}
    >
      <Card className="shadow-lg border-2 border-indigo-200 dark:border-indigo-700">
        <div className="flex items-center gap-4">
          {/* Selection info */}
          <div className="flex items-center gap-3">
            {onSelectAll && (
              <Checkbox
                checked={allSelected}
                onChange={onSelectAll}
                aria-label="Select all"
              />
            )}
            <Typography variant="body" weight="medium">
              {selectedCount} {itemType} selected
              {totalCount && !allSelected && (
                <span className="text-gray-500 dark:text-gray-400 font-normal">
                  {' '}of {totalCount}
                </span>
              )}
            </Typography>
          </div>
          
          <Divider orientation="vertical" className="h-8" />
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
              >
                <Icon 
                  icon={action.icon} 
                  size="sm" 
                  className={cn('mr-1', action.loading && 'animate-spin')}
                />
                {action.label}
              </Button>
            ))}
          </div>
          
          <Divider orientation="vertical" className="h-8" />
          
          {/* Clear selection */}
          {onClearSelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              aria-label="Clear selection"
            >
              <Icon icon={X} size="sm" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

BulkActionBar.displayName = 'BulkActionBar';





