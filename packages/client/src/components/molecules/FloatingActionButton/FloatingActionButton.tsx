/**
 * FloatingActionButton Molecule Component
 * 
 * A floating action button that can expand into multiple actions vertically.
 * Uses Button atom.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { cn } from '../../../utils/theme';

export interface FloatingAction {
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
   * Action click handler
   */
  onClick: () => void;
  
  /**
   * Action variant
   */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
}

export interface FloatingActionButtonProps {
  /**
   * Single action (if only one action, button will directly trigger onClick)
   */
  action?: {
    icon: LucideIcon;
    onClick: () => void;
    label?: string;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  };
  
  /**
   * Multiple actions (if provided, button will expand to show all actions)
   */
  actions?: FloatingAction[];
  
  /**
   * Button position
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  action,
  actions,
  position = 'bottom-right',
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded || (!actions || actions.length <= 1)) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, actions]);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  // Single action - direct onClick
  if (action && (!actions || actions.length === 0)) {
    return (
      <div className={cn('fixed z-50', positionClasses[position], className)}>
        <Button
          variant={action.variant || 'primary'}
          size="lg"
          icon={action.icon}
          onClick={action.onClick}
          className="rounded-full shadow-lg"
          aria-label={action.label || 'Action'}
        >
          {action.label && <span className="sr-only">{action.label}</span>}
        </Button>
      </div>
    );
  }

  // Multiple actions - expandable
  if (actions && actions.length > 0) {
    const handleMainClick = () => {
      if (actions.length === 1) {
        actions[0].onClick();
      } else {
        setIsExpanded(!isExpanded);
      }
    };

    return (
      <div
        ref={fabRef}
        className={cn(
          'fixed z-50 flex flex-col items-end gap-3',
          positionClasses[position],
          position.includes('left') && 'items-start',
          className
        )}
      >
        {/* Expanded Action Buttons */}
        {isExpanded && actions.length > 1 && (
          <div className={cn(
            'flex flex-col gap-3',
            position.includes('left') ? 'items-start' : 'items-end'
          )}>
            {actions.map((actionItem, index) => (
              <div
                key={actionItem.id}
                className="flex items-center gap-2 transition-all duration-200"
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transform: isExpanded ? 'translateY(0)' : 'translateY(10px)',
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                {position.includes('right') && (
                  <span className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm whitespace-nowrap">
                    {actionItem.label}
                  </span>
                )}
                <Button
                  variant={actionItem.variant || 'primary'}
                  size="lg"
                  icon={actionItem.icon}
                  onClick={() => {
                    setIsExpanded(false);
                    actionItem.onClick();
                  }}
                  className="rounded-full shadow-lg"
                  aria-label={actionItem.label}
                >
                  <span className="sr-only">{actionItem.label}</span>
                </Button>
                {position.includes('left') && (
                  <span className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm whitespace-nowrap">
                    {actionItem.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <Button
          variant={isExpanded ? 'secondary' : 'primary'}
          size="lg"
          icon={isExpanded ? X : Plus}
          onClick={handleMainClick}
          className="rounded-full shadow-lg transition-all duration-300"
          aria-label={isExpanded ? 'Close actions' : 'Open actions'}
          aria-expanded={isExpanded}
        >
          <span className="sr-only">{isExpanded ? 'Close' : 'Open'}</span>
        </Button>
      </div>
    );
  }

  return null;
};

FloatingActionButton.displayName = 'FloatingActionButton';

