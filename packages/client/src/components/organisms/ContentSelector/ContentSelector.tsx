/**
 * ContentSelector Organism Component
 * 
 * A reusable component for selecting items with checkboxes.
 * Used for selecting modules, lessons, or other content for publishing.
 * Uses Checkbox, Badge, Typography atoms and Card, EmptyState molecules.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Checkbox } from '../../atoms/Checkbox';
import { Badge } from '../../atoms/Badge';
import { Typography } from '../../atoms/Typography';
import { Spinner } from '../../atoms/Spinner';
import { Card } from '../../molecules/Card';
import { EmptyState } from '../../molecules/EmptyState';
import { cn } from '../../../utils/theme';

export interface ContentSelectorItem {
  /**
   * Unique identifier for the item
   */
  id: string;
  
  /**
   * Primary label to display
   */
  label: string;
  
  /**
   * Optional secondary label/description
   */
  sublabel?: string;
  
  /**
   * Sequence number for display (e.g., #1, #2)
   */
  sequence?: number;
  
  /**
   * Whether this item is currently checked
   */
  checked: boolean;
  
  /**
   * Whether this item is disabled
   */
  disabled?: boolean;
  
  /**
   * Badges to display (e.g., "Published", "Has Content")
   */
  badges?: Array<{
    label: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  }>;
  
  /**
   * Custom action button for the item
   */
  action?: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export interface ContentSelectorProps {
  /**
   * Items to display for selection
   */
  items: ContentSelectorItem[];
  
  /**
   * Callback when selection changes. Receives array of selected item IDs.
   */
  onSelectionChange: (selectedIds: string[]) => void;
  
  /**
   * Label for the "Select All" option
   * @default "Select All"
   */
  selectAllLabel?: string;
  
  /**
   * Whether the selector is in a loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Configuration for empty state display
   */
  emptyState?: {
    icon?: LucideIcon;
    title: string;
    description?: string;
  };
  
  /**
   * Header content to display above the selector
   */
  header?: React.ReactNode;
  
  /**
   * Maximum height for the scrollable list area
   * @default '320px' (max-h-80)
   */
  maxHeight?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ContentSelector: React.FC<ContentSelectorProps> = ({
  items,
  onSelectionChange,
  selectAllLabel = 'Select All',
  loading = false,
  emptyState,
  header,
  maxHeight = '320px',
  className,
}) => {
  // Calculate selection state
  const selectedIds = items.filter(item => item.checked).map(item => item.id);
  const allSelected = items.length > 0 && items.every(item => item.checked || item.disabled);
  const someSelected = items.some(item => item.checked) && !allSelected;
  const selectableItems = items.filter(item => !item.disabled);
  
  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all (keep disabled items as they were)
      onSelectionChange([]);
    } else {
      // Select all selectable items
      onSelectionChange(selectableItems.map(item => item.id));
    }
  };
  
  const handleToggle = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item?.disabled) return;
    
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };
  
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (items.length === 0 && emptyState) {
    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        className={className}
      />
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Optional Header */}
      {header}
      
      {/* Select All Header */}
      {items.length > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={handleSelectAll}
            label={selectAllLabel}
          />
          <Badge variant="default">
            {selectedIds.length} / {items.length}
          </Badge>
        </div>
      )}
      
      {/* Items List */}
      <div 
        className="space-y-2 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {items.map(item => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
              item.checked && !item.disabled
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => !item.disabled && handleToggle(item.id)}
          >
            {/* Checkbox */}
            <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
              <Checkbox
                checked={item.checked}
                disabled={item.disabled}
                onChange={() => handleToggle(item.id)}
              />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sequence Number */}
                {item.sequence !== undefined && (
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    #{item.sequence + 1}
                  </span>
                )}
                
                {/* Label */}
                <Typography 
                  variant="body" 
                  className="font-medium text-gray-900 dark:text-gray-100 truncate"
                >
                  {item.label}
                </Typography>
                
                {/* Badges */}
                {item.badges?.map((badge, idx) => (
                  <Badge 
                    key={idx} 
                    variant={badge.variant || 'default'} 
                    size="sm"
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
              
              {/* Sublabel */}
              {item.sublabel && (
                <Typography 
                  variant="small" 
                  className="text-gray-500 dark:text-gray-400 mt-0.5 truncate"
                >
                  {item.sublabel}
                </Typography>
              )}
            </div>
            
            {/* Action Button */}
            {item.action && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.action?.disabled) {
                    item.action?.onClick();
                  }
                }}
                disabled={item.action.disabled}
                className={cn(
                  'flex-shrink-0 p-1.5 rounded transition-colors',
                  'text-indigo-600 dark:text-indigo-400',
                  'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                title={item.action.label}
              >
                <item.action.icon size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

ContentSelector.displayName = 'ContentSelector';

export default ContentSelector;
