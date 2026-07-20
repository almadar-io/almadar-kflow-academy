/**
 * SearchInput molecule — a text input with a search icon prefix and built-in
 * debounce. The field updates instantly (local state) so typing never lags or
 * blocks the UI; the parent's `onChange` only fires after the debounce window,
 * so heavy consumers (server queries, graph re-renders) don't run per keystroke.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@almadar/ui';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  debounceMs = 300,
}) => {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes (e.g. a programmatic clear) into the field.
  useEffect(() => { setLocal(value); }, [value]);

  // Clear any pending debounce on unmount.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleChange = (next: string) => {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), debounceMs);
  };

  return (
    <Input
      type="search"
      value={local}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      leftIcon={Search}
      className={className}
    />
  );
};

SearchInput.displayName = 'SearchInput';
