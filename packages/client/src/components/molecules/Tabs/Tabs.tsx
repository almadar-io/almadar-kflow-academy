/**
 * Tabs Molecule Component
 * 
 * A tabbed interface component with keyboard navigation and badge support.
 * Uses Button, Icon, Badge, Typography, and Divider atoms.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Badge } from '../../atoms/Badge';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export interface TabItem {
  /**
   * Tab ID
   */
  id: string;
  
  /**
   * Tab label
   */
  label: string;
  
  /**
   * Tab content
   */
  content: React.ReactNode;
  
  /**
   * Tab icon
   */
  icon?: LucideIcon;
  
  /**
   * Tab badge
   */
  badge?: string | number;
  
  /**
   * Disable tab
   */
  disabled?: boolean;
}

export interface TabsProps {
  /**
   * Tab items
   */
  items: TabItem[];
  
  /**
   * Default active tab ID
   */
  defaultActiveTab?: string;
  
  /**
   * Controlled active tab ID
   */
  activeTab?: string;
  
  /**
   * Callback when tab changes
   */
  onTabChange?: (tabId: string) => void;
  
  /**
   * Tab variant
   * @default 'default'
   */
  variant?: 'default' | 'pills' | 'underline';
  
  /**
   * Tab orientation
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  defaultActiveTab,
  activeTab: controlledActiveTab,
  onTabChange,
  variant = 'default',
  orientation = 'horizontal',
  className,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultActiveTab || items[0]?.id || ''
  );
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleTabChange = (tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    onTabChange?.(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string, index: number) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = (index + direction + items.length) % items.length;
      const nextTab = items[nextIndex];
      if (nextTab && !nextTab.disabled) {
        handleTabChange(nextTab.id);
        tabRefs.current[nextTab.id]?.focus();
      }
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const targetIndex = e.key === 'Home' ? 0 : items.length - 1;
      const targetTab = items[targetIndex];
      if (targetTab && !targetTab.disabled) {
        handleTabChange(targetTab.id);
        tabRefs.current[targetTab.id]?.focus();
      }
    }
  };

  const activeTabContent = items.find(item => item.id === activeTab)?.content;

  const variantClasses = {
    default: 'border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 data-[active=true]:border-indigo-600 dark:data-[active=true]:border-indigo-500',
    pills: 'rounded-lg data-[active=true]:bg-indigo-100 dark:data-[active=true]:bg-indigo-900/30 data-[active=true]:text-indigo-700 dark:data-[active=true]:text-indigo-300',
    underline: 'border-b-2 border-transparent data-[active=true]:border-indigo-600 dark:data-[active=true]:border-indigo-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        role="tablist"
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row border-b border-gray-200 dark:border-gray-700' : 'flex-col border-r border-gray-200 dark:border-gray-700',
          variant === 'pills' && 'gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border-0',
          variant === 'underline' && orientation === 'vertical' && 'border-b-0'
        )}
      >
        {items.map((item, index) => {
          const isActive = item.id === activeTab;
          const isDisabled = item.disabled;

          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.id}`}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => !isDisabled && handleTabChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id, index)}
              data-active={isActive}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                variantClasses[variant],
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              {item.icon && <Icon icon={item.icon} size="sm" />}
              <Typography variant="small" weight={isActive ? 'semibold' : 'normal'}>
                {item.label}
              </Typography>
              {item.badge !== undefined && (
                <Badge variant="default" size="sm">
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="mt-4"
      >
        {activeTabContent}
      </div>
    </div>
  );
};

Tabs.displayName = 'Tabs';
