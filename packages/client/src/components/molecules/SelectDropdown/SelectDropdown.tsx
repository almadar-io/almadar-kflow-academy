/**
 * SelectDropdown Molecule Component
 * 
 * A select dropdown component with search/filter, multi-select, and keyboard navigation.
 * Uses Button, Input, Icon, Divider atoms and Menu molecule.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { Typography } from '../../atoms/Typography';
import { Menu } from '../Menu';
import { cn } from '../../../utils/theme';

export interface SelectOption {
  /**
   * Option value
   */
  value: string;
  
  /**
   * Option label
   */
  label: string;
  
  /**
   * Option disabled
   */
  disabled?: boolean;
  
  /**
   * Option group (for grouping)
   */
  group?: string;
}

export interface SelectDropdownProps {
  /**
   * Options to display
   */
  options: SelectOption[];
  
  /**
   * Selected value(s)
   */
  value?: string | string[];
  
  /**
   * Callback when selection changes
   */
  onChange?: (value: string | string[]) => void;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Enable multi-select
   * @default false
   */
  multiple?: boolean;
  
  /**
   * Enable search/filter
   * @default false
   */
  searchable?: boolean;
  
  /**
   * Disable select
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Show clear button
   * @default false
   */
  clearable?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  multiple = false,
  searchable = false,
  disabled = false,
  clearable = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValues = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (value ? [value as string] : []);

  const filteredOptions = searchable && searchQuery
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const groupedOptions = filteredOptions.reduce((acc, opt) => {
    const group = opt.group || 'default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, SelectOption[]>);

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : '');
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (multiple) {
      if (selectedValues.length === 1) {
        return options.find(opt => opt.value === selectedValues[0])?.label || placeholder;
      }
      return `${selectedValues.length} selected`;
    }
    return options.find(opt => opt.value === selectedValues[0])?.label || placeholder;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const menuItems = Object.entries(groupedOptions).flatMap(([group, opts]) => {
    const groupItems = opts.map(opt => ({
      id: opt.value,
      label: opt.label,
      disabled: opt.disabled,
      onClick: () => !opt.disabled && handleSelect(opt.value),
    }));

    if (group !== 'default' && opts.length > 0) {
      return [
        { id: `group-${group}`, label: group, disabled: true, onClick: () => {} },
        ...groupItems,
      ];
    }

    return groupItems;
  });

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-2',
          'border border-gray-300 dark:border-gray-600 rounded-lg',
          'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          'hover:border-gray-400 dark:hover:border-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'border-indigo-500 dark:border-indigo-500'
        )}
      >
        <span className={cn(
          'flex-1 text-left truncate',
          selectedValues.length === 0 && 'text-gray-500 dark:text-gray-400'
        )}>
          {getDisplayText()}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              aria-label="Clear selection"
            >
              <Icon icon={X} size="sm" />
            </button>
          )}
          <Icon
            icon={ChevronDown}
            size="sm"
            className={cn(
              'transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 w-full mt-2',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
            'max-h-60 overflow-auto'
          )}
        >
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([group, opts]) => (
                <div key={group}>
                  {group !== 'default' && (
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {group}
                    </div>
                  )}
                  {opts.map((opt) => {
                    const isSelected = selectedValues.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        disabled={opt.disabled}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-sm',
                          'hover:bg-gray-100 dark:hover:bg-gray-700',
                          'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          isSelected && 'bg-indigo-50 dark:bg-indigo-900/20'
                        )}
                      >
                        <Typography variant="small">{opt.label}</Typography>
                        {isSelected && (
                          <Icon icon={Check} size="sm" className="text-indigo-600 dark:text-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

SelectDropdown.displayName = 'SelectDropdown';
