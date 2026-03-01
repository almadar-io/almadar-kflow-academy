/**
 * Menu Molecule Component
 * 
 * A dropdown menu component with items, icons, dividers, and sub-menus.
 * Uses Button, Icon, Divider, Typography, and Badge atoms.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { cn } from '../../../utils/theme';

export interface MenuItem {
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
   * Disable item
   */
  disabled?: boolean;
  
  /**
   * Item click handler
   */
  onClick?: () => void;
  
  /**
   * Sub-menu items
   */
  subMenu?: MenuItem[];
}

export interface MenuProps {
  /**
   * Menu trigger element
   */
  trigger: React.ReactElement;
  
  /**
   * Menu items
   */
  items: MenuItem[];
  
  /**
   * Menu position
   * @default 'bottom-left'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Menu: React.FC<MenuProps> = ({
  trigger,
  items,
  position = 'bottom-left',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
    setActiveSubMenu(null);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    
    if (item.subMenu && item.subMenu.length > 0) {
      setActiveSubMenu(item.id);
    } else {
      item.onClick?.();
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveSubMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const positionClasses = {
    'top-left': 'bottom-full left-0 mb-2',
    'top-right': 'bottom-full right-0 mb-2',
    'bottom-left': 'top-full left-0 mt-2',
    'bottom-right': 'top-full right-0 mt-2',
  };

  const triggerElement = React.cloneElement(trigger as React.ReactElement<any>, {
    ref: triggerRef,
    onClick: handleToggle,
  });

  const renderMenuItem = (item: MenuItem, hasSubMenu: boolean) => (
    <button
      key={item.id}
      type="button"
      onClick={() => handleItemClick(item)}
      disabled={item.disabled}
      onMouseEnter={() => hasSubMenu && setActiveSubMenu(item.id)}
      className={cn(
        'w-full flex items-center justify-between gap-3 px-4 py-2 text-left',
        'text-sm transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        item.disabled && 'cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {item.icon && (
          <Icon icon={item.icon} size="sm" className="flex-shrink-0" />
        )}
        <Typography variant="small" className="flex-1">
          {item.label}
        </Typography>
        {item.badge !== undefined && (
          <Badge variant="default" size="sm">
            {item.badge}
          </Badge>
        )}
        {hasSubMenu && (
          <Icon icon={ChevronRight} size="sm" className="flex-shrink-0" />
        )}
      </div>
    </button>
  );

  const renderMenuItems = (menuItems: MenuItem[]) => {
    return menuItems.map((item, index) => {
      const hasSubMenu = item.subMenu && item.subMenu.length > 0;
      const isDivider = item.id === 'divider';

      if (isDivider) {
        return <Divider key={`divider-${index}`} className="my-1" />;
      }

      return (
        <div key={item.id}>
          {renderMenuItem(item, !!hasSubMenu)}
          {hasSubMenu && activeSubMenu === item.id && item.subMenu && (
            <div
              className={cn(
                'absolute left-full top-0 ml-2',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
                'min-w-[200px] py-1 z-50'
              )}
            >
              {renderMenuItems(item.subMenu)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="relative">
      {triggerElement}
      {isOpen && triggerRect && (
        <div
          ref={menuRef}
          className={cn(
            'absolute z-50',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
            'min-w-[200px] py-1',
            positionClasses[position],
            className
          )}
          style={{
            left: position.includes('left') ? 0 : 'auto',
            right: position.includes('right') ? 0 : 'auto',
          }}
          role="menu"
        >
          {renderMenuItems(items)}
        </div>
      )}
    </div>
  );
};

Menu.displayName = 'Menu';
