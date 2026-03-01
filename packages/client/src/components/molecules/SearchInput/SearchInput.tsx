/**
 * SearchInput Molecule Component
 * 
 * A search input component with icon, clear button, and loading state.
 * Uses Input, Icon, Button, and Spinner atoms.
 */

import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../../atoms/Input';
import { Icon } from '../../atoms/Icon';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { cn } from '../../../utils/theme';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Search value
   */
  value?: string;
  
  /**
   * Callback when search value changes
   */
  onSearch?: (value: string) => void;
  
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceMs?: number;
  
  /**
   * Show loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Placeholder text
   * @default 'Search...'
   */
  placeholder?: string;
  
  /**
   * Show clear button
   * @default true
   */
  clearable?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onSearch,
  debounceMs = 300,
  loading = false,
  placeholder = 'Search...',
  clearable = true,
  className,
  ...props
}) => {
  const [searchValue, setSearchValue] = useState(value || '');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      onSearch?.(newValue);
    }, debounceMs);

    setDebounceTimer(timer);
  }, [onSearch, debounceMs, debounceTimer]);

  const handleClear = useCallback(() => {
    setSearchValue('');
    onSearch?.('');
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  }, [onSearch, debounceTimer]);

  React.useEffect(() => {
    if (value !== undefined && value !== searchValue) {
      setSearchValue(value);
    }
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <div className={cn('relative', className)}>
      <Input
        type="search"
        value={searchValue}
        onChange={handleChange}
        placeholder={placeholder}
        icon={Search}
        clearable={clearable && !loading}
        onClear={handleClear}
        disabled={loading}
        className="pr-10"
        {...props}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Spinner size="sm" color="primary" />
        </div>
      )}
    </div>
  );
};

SearchInput.displayName = 'SearchInput';

