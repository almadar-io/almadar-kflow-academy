/**
 * Sidebar Organism Component
 * 
 * A sidebar component with logo, navigation items, user section, and collapse/expand.
 * Styled to match the main Layout component.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface SidebarItem {
  /**
   * Item ID
   */
  id: string;
  
  /**
   * Item label
   */
  label: string;
  
  /**
   * Item icon
   */
  icon?: LucideIcon;
  
  /**
   * Item badge
   */
  badge?: string | number;
  
  /**
   * Item href
   */
  href?: string;
  
  /**
   * Item click handler
   */
  onClick?: () => void;
  
  /**
   * Is active
   */
  active?: boolean;
  
  /**
   * @deprecated Use `active` instead
   */
  isActive?: boolean;
  
  /**
   * Sub-items (for nested navigation)
   */
  subItems?: SidebarItem[];
}

export interface SidebarProps {
  /**
   * Logo/Brand content - can be a ReactNode or logo config
   */
  logo?: React.ReactNode;
  
  /**
   * Logo image source
   */
  logoSrc?: string;
  
  /**
   * Brand/App name
   */
  brandName?: string;
  
  /**
   * Navigation items
   */
  items: SidebarItem[];
  
  /**
   * User section content
   */
  userSection?: React.ReactNode;
  
  /**
   * Footer content (e.g., theme toggle)
   */
  footerContent?: React.ReactNode;
  
  /**
   * Collapsed state (controlled)
   */
  collapsed?: boolean;
  
  /**
   * Default collapsed state
   * @default false
   */
  defaultCollapsed?: boolean;
  
  /**
   * Callback when collapse state changes
   */
  onCollapseChange?: (collapsed: boolean) => void;
  
  /**
   * Hide the collapse/expand button (useful for mobile where sidebar is controlled externally)
   * @default false
   */
  hideCollapseButton?: boolean;
  
  /**
   * Show a close button (useful for mobile where sidebar should be closed)
   * @default false
   */
  showCloseButton?: boolean;
  
  /**
   * Callback when close button is clicked (for mobile)
   */
  onClose?: () => void;
  
  /**
   * Callback when logo/brand is clicked
   */
  onLogoClick?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Single navigation item component
 */
const SidebarNavItem: React.FC<{
  item: SidebarItem;
  collapsed: boolean;
}> = ({ item, collapsed }) => {
  const Icon = item.icon;
  const isActive = item.active ?? item.isActive;
  
  return (
    <button
      onClick={item.onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
      )}
      title={collapsed ? item.label : undefined}
    >
      {Icon && (
        <Icon 
          size={20} 
          className={cn(
            'min-w-[20px] flex-shrink-0',
            isActive && 'text-indigo-600 dark:text-indigo-400'
          )} 
        />
      )}
      
      {!collapsed && (
        <span className="font-medium truncate flex-1 text-left">{item.label}</span>
      )}
      
      {!collapsed && item.badge !== undefined && (
        <Badge variant="danger" size="sm">{item.badge}</Badge>
      )}
      
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          {item.label}
        </div>
      )}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  logo,
  logoSrc,
  brandName = 'KFlow',
  items,
  userSection,
  footerContent,
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapseChange,
  hideCollapseButton = false,
  showCloseButton = false,
  onClose,
  onLogoClick,
  className,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapseChange?.(newCollapsed);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Header with Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div 
          className={cn(
            'flex items-center gap-3 cursor-pointer',
            collapsed && 'justify-center w-full'
          )}
          onClick={onLogoClick}
        >
          {/* Logo image or custom logo */}
          {logo ? (
            typeof logo === 'string' ? (
              <img src={logo} alt={brandName} className="h-8 w-8" />
            ) : (
              logo
            )
          ) : logoSrc ? (
            <img src={logoSrc} alt={brandName} className="h-8 w-8" />
          ) : (
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
          )}
          
          {/* Brand name */}
          {!collapsed && (
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {brandName}
            </span>
          )}
        </div>
        
        {/* Collapse button */}
        {!hideCollapseButton && (
          <button
            onClick={handleToggle}
            className={cn(
              'p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hidden lg:block',
              collapsed && 'mx-auto'
            )}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
        
        {/* Close button for mobile */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer with User Section and additional content */}
      {(footerContent || userSection) && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1 flex-shrink-0">
          <div className={cn(
            'flex items-center',
            collapsed ? 'justify-center flex-col gap-4' : 'justify-between px-2'
          )}>
            {/* Footer content (e.g., theme toggle) */}
            {footerContent && (
              <div className="flex items-center">
                {footerContent}
              </div>
            )}
            
            {/* User section */}
            {userSection && (
              <div className="flex items-center">
                {userSection}
              </div>
            )}
          </div>
          
          {/* Expand button at bottom when collapsed (mobile) */}
          {collapsed && !hideCollapseButton && (
            <button
              onClick={handleToggle}
              className="w-full flex justify-center p-2 mt-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 lg:hidden"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

Sidebar.displayName = 'Sidebar';
