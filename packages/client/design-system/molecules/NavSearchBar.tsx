/**
 * NavSearchBar molecule — top-nav search with autocomplete.
 *
 * Uses Input directly (not SearchInput) so the autocomplete dropdown filters
 * on every keystroke, not after a debounce. The debounced onChange still
 * drives server-side card-list filtering; the immediate inputValue drives
 * the dropdown.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Box, Input, Typography, cn, useEventBus, useTranslate } from '@almadar/ui';
import { useLearningPaths } from '@features/knowledge-graph/hooks/useLearningPaths';

export interface NavSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const NavSearchBar: React.FC<NavSearchBarProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const { t } = useTranslate();
  const { emit } = useEventBus();
  const { learningPaths } = useLearningPaths();
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setInputValue(value); }, [value]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const results = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return [];
    return learningPaths
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [inputValue, learningPaths]);

  const showDropdown = focused && inputValue.trim().length > 0 && results.length > 0;

  const handleChange = (next: string) => {
    setInputValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 300);
  };

  const handleSelect = (graphId: string) => {
    emit('UI:LEARNING_PATH_CLICK', { graphId, pathId: graphId });
    setInputValue('');
    onChange('');
    setFocused(false);
  };

  return (
    <Box className={cn('relative flex-1 max-w-lg', className)}>
      <Input
        type="search"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { blurRef.current = setTimeout(() => setFocused(false), 150); }}
        placeholder={placeholder ?? t('nav.searchPlaceholder')}
        leftIcon={Search}
        className="!h-9 !rounded-lg !bg-[var(--color-muted)] !border-transparent focus:!bg-[var(--color-card)] focus:!border-[var(--color-border)] !text-sm"
      />
      {showDropdown && (
        <Box
          className="absolute top-full inset-inline-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((p) => (
            <Box
              key={p.id}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-[var(--color-muted)] transition-colors"
              onClick={() => handleSelect(p.id)}
            >
              <Search size={14} className="flex-shrink-0 text-[var(--color-muted-foreground)]" />
              <Typography variant="small" className="truncate flex-1">{p.title}</Typography>
              <Typography variant="small" color="muted" className="flex-shrink-0">
                {p.conceptCount} {t('dashboard.statConcepts').toLowerCase()}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

NavSearchBar.displayName = 'NavSearchBar';
