/**
 * Breadcrumb Molecule Component
 * 
 * A breadcrumb navigation component with separators and icons.
 * Uses Button, Icon, and Typography atoms.
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export interface BreadcrumbItem {
  /**
   * Item label
   */
  label: string;
  
  /**
   * Item href (if provided, renders as link)
   */
  href?: string;
  
  /**
   * Item icon
   */
  icon?: LucideIcon;
  
  /**
   * Click handler (if href not provided)
   */
  onClick?: () => void;
  
  /**
   * Is current page
   */
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  /**
   * Breadcrumb items
   */
  items: BreadcrumbItem[];
  
  /**
   * Separator icon
   */
  separator?: LucideIcon;
  
  /**
   * Maximum items to show (truncates with ellipsis)
   */
  maxItems?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = ChevronRight,
  maxItems,
  className,
}) => {
  const displayItems = maxItems && items.length > maxItems
    ? [...items.slice(0, 1), { label: '...', isCurrent: false } as BreadcrumbItem, ...items.slice(-maxItems + 1)]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-2', className)}>
      <ol className="flex items-center gap-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li key={index} className="flex items-center gap-2">
              {isEllipsis ? (
                <Typography variant="small" color="muted">
                  {item.label}
                </Typography>
              ) : item.href || item.onClick ? (
                <a
                  href={item.href || '#'}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick();
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    isLast
                      ? 'text-gray-900 dark:text-gray-100 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <Icon icon={item.icon} size="sm" />}
                  <Typography variant="small" weight={isLast ? 'medium' : 'normal'}>
                    {item.label}
                  </Typography>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded',
                    isLast
                      ? 'text-gray-900 dark:text-gray-100 font-medium cursor-default'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                  disabled={isLast}
                >
                  {item.icon && <Icon icon={item.icon} size="sm" />}
                  <Typography variant="small" weight={isLast ? 'medium' : 'normal'}>
                    {item.label}
                  </Typography>
                </button>
              )}
              
              {!isLast && (
                <Icon
                  icon={separator}
                  size="sm"
                  className="text-gray-400 dark:text-gray-500"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumb.displayName = 'Breadcrumb';

