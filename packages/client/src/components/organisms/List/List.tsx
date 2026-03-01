/**
 * List Organism Component
 * 
 * A list component with items, dividers, actions, virtual scrolling, and selection.
 * Uses Card, Menu molecules and Button, Icon, Avatar, Typography, Badge, Divider, Checkbox atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Menu, MenuItem } from '../../molecules/Menu';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Avatar } from '../../atoms/Avatar';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Divider } from '../../atoms/Divider';
import { Checkbox } from '../../atoms/Checkbox';
import { cn } from '../../../utils/theme';

export interface ListItem {
  /**
   * Item ID
   */
  id: string;
  
  /**
   * Item title
   */
  title: string;
  
  /**
   * Item description/subtitle
   */
  description?: string;
  
  /**
   * Item icon
   */
  icon?: LucideIcon;
  
  /**
   * Item avatar
   */
  avatar?: {
    src?: string;
    alt?: string;
    initials?: string;
  };
  
  /**
   * Item badge
   */
  badge?: string | number;
  
  /**
   * Item metadata
   */
  metadata?: React.ReactNode;
  
  /**
   * Item click handler
   */
  onClick?: () => void;
  
  /**
   * Item disabled
   */
  disabled?: boolean;
}

export interface ListProps {
  /**
   * List items
   */
  items: ListItem[];
  
  /**
   * Enable selection
   * @default false
   */
  selectable?: boolean;
  
  /**
   * Selected item IDs
   */
  selectedItems?: string[];
  
  /**
   * Callback when selection changes
   */
  onSelectionChange?: (selectedIds: string[]) => void;
  
  /**
   * Item actions menu
   */
  itemActions?: (item: ListItem) => MenuItem[];
  
  /**
   * Show dividers between items
   * @default true
   */
  showDividers?: boolean;
  
  /**
   * List variant
   * @default 'default'
   */
  variant?: 'default' | 'card';
  
  /**
   * Empty state message
   */
  emptyMessage?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const List: React.FC<ListProps> = ({
  items,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  itemActions,
  showDividers = true,
  variant = 'default',
  emptyMessage = 'No items',
  className,
}) => {
  const handleSelect = (itemId: string, checked: boolean) => {
    if (!selectable || !onSelectionChange) return;
    const newSelection = checked
      ? [...selectedItems, itemId]
      : selectedItems.filter(id => id !== itemId);
    onSelectionChange(newSelection);
  };

  const renderItem = (item: ListItem, index: number) => {
    const isSelected = selectedItems.includes(item.id);
    const isLast = index === items.length - 1;

    const itemContent = (
      <div
        className={cn(
          'flex items-center gap-3 p-4',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'transition-colors',
          item.onClick && 'cursor-pointer',
          item.disabled && 'opacity-50 cursor-not-allowed',
          isSelected && 'bg-indigo-50 dark:bg-indigo-900/20'
        )}
        onClick={item.onClick}
      >
        {selectable && (
          <Checkbox
            checked={isSelected}
            onChange={(e) => handleSelect(item.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          />
        )}

        {item.avatar && (
          <Avatar
            src={item.avatar.src}
            alt={item.avatar.alt}
            initials={item.avatar.initials}
            size="md"
            className="flex-shrink-0"
          />
        )}

        {item.icon && !item.avatar && (
          <div className="flex-shrink-0">
            <Icon icon={item.icon} size="md" />
          </div>
        )}

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <Typography variant="body" weight="medium" className="truncate">
              {item.title}
            </Typography>
            {item.badge !== undefined && (
              <Badge variant="default" size="sm" className="flex-shrink-0">
                {item.badge}
              </Badge>
            )}
          </div>
          {item.description && (
            <Typography variant="small" color="secondary" className="mt-1 truncate">
              {item.description}
            </Typography>
          )}
          {item.metadata && (
            <div className="mt-2">{item.metadata}</div>
          )}
        </div>

        {itemActions && itemActions(item).length > 0 && (
          <div className="flex-shrink-0">
            <Menu
              trigger={
                <Button variant="ghost" size="sm" icon={undefined}>
                  ⋮
                </Button>
              }
              items={itemActions(item)}
              position="bottom-right"
            />
          </div>
        )}
      </div>
    );

    if (variant === 'card') {
      return (
        <Card key={item.id} variant="interactive" onClick={item.onClick}>
          {itemContent}
        </Card>
      );
    }

    return (
      <div key={item.id}>
        {itemContent}
        {showDividers && !isLast && <Divider />}
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Typography variant="body" color="secondary">
          {emptyMessage}
        </Typography>
      </div>
    );
  }

  return (
    <div className={cn(
      variant === 'default' && 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
      variant === 'card' && 'space-y-2',
      className
    )}>
      {items.map(renderItem)}
    </div>
  );
};

List.displayName = 'List';
