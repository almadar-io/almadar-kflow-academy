/**
 * Accordion Molecule Component
 * 
 * A collapsible content component with single or multiple open items.
 * Uses Button, Icon, Typography, and Divider atoms.
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface AccordionItem {
  /**
   * Item ID
   */
  id: string;
  
  /**
   * Item header/title
   */
  header: React.ReactNode;
  
  /**
   * Item content
   */
  content: React.ReactNode;
  
  /**
   * Disable item
   */
  disabled?: boolean;
  
  /**
   * Default open state
   */
  defaultOpen?: boolean;
}

export interface AccordionProps {
  /**
   * Accordion items
   */
  items: AccordionItem[];
  
  /**
   * Allow multiple items open at once
   * @default false
   */
  multiple?: boolean;
  
  /**
   * Default open items (IDs)
   */
  defaultOpenItems?: string[];
  
  /**
   * Controlled open items (IDs)
   */
  openItems?: string[];
  
  /**
   * Callback when item opens/closes
   */
  onItemToggle?: (itemId: string, isOpen: boolean) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  multiple = false,
  defaultOpenItems,
  openItems: controlledOpenItems,
  onItemToggle,
  className,
}) => {
  const [internalOpenItems, setInternalOpenItems] = useState<Set<string>>(
    new Set(defaultOpenItems || items.filter(item => item.defaultOpen).map(item => item.id))
  );

  const openItemsSet = controlledOpenItems
    ? new Set(controlledOpenItems)
    : internalOpenItems;

  const handleToggle = (itemId: string) => {
    const isOpen = openItemsSet.has(itemId);
    const newOpenItems = new Set(openItemsSet);

    if (isOpen) {
      newOpenItems.delete(itemId);
    } else {
      if (!multiple) {
        newOpenItems.clear();
      }
      newOpenItems.add(itemId);
    }

    if (controlledOpenItems === undefined) {
      setInternalOpenItems(newOpenItems);
    }

    onItemToggle?.(itemId, !isOpen);
  };

  return (
    <div className={cn('w-full', className)}>
      {items.map((item, index) => {
        const isOpen = openItemsSet.has(item.id);
        const isDisabled = item.disabled;

        return (
          <div key={item.id} className={index > 0 ? 'mt-2' : ''}>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => !isDisabled && handleToggle(item.id)}
                disabled={isDisabled}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3',
                  'bg-white dark:bg-gray-800',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isOpen && 'bg-gray-50 dark:bg-gray-700'
                )}
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${item.id}`}
              >
                <div className="flex-1 text-left">
                  {typeof item.header === 'string' ? (
                    <Typography variant="body" weight="medium">
                      {item.header}
                    </Typography>
                  ) : (
                    item.header
                  )}
                </div>
                <Icon
                  icon={ChevronDown}
                  size="sm"
                  className={cn(
                    'transition-transform duration-200',
                    isOpen && 'transform rotate-180'
                  )}
                />
              </button>

              {isOpen && (
                <div
                  id={`accordion-content-${item.id}`}
                  className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                >
                  {item.content}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

Accordion.displayName = 'Accordion';

