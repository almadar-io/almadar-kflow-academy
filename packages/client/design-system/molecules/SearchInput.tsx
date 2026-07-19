/**
 * SearchInput molecule — a controlled text input with a search icon prefix.
 * Used by the Home learning-path grid's quick search.
 */

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@almadar/ui';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, className }) => {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      leftIcon={Search}
      className={className}
    />
  );
};

SearchInput.displayName = 'SearchInput';
