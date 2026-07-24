/**
 * NavSearchBar molecule — top-nav search with autocomplete.
 *
 * Wraps the existing SearchInput (debounced onChange for server-side card-list
 * filtering) and adds an immediate client-side autocomplete dropdown of matching
 * learning paths. Selecting a result emits UI:LEARNING_PATH_CLICK.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Box, Typography, cn, useEventBus, useTranslate } from '@almadar/ui';
import { SearchInput } from './SearchInput';
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
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return learningPaths
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 6);
  }, [value, learningPaths]);

  const showDropdown = focused && value.trim().length > 0 && results.length > 0;

  const handleSelect = (graphId: string, pathId: string) => {
    emit('UI:LEARNING_PATH_CLICK', { graphId, pathId });
    onChange('');
    setFocused(false);
  };

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setFocused(false), 150);
  };

  return (
    <Box className={cn('relative flex-1 max-w-md', className)}>
      <div onFocus={handleFocus} onBlur={handleBlur}>
        <SearchInput
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? t('nav.searchPlaceholder')}
          debounceMs={300}
        />
      </div>
      {showDropdown && (
        <Box className="absolute top-full inset-inline-0 z-50 mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p.id, p.id);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-[var(--color-muted)] transition-colors"
            >
              <Search size={14} className="flex-shrink-0 text-[var(--color-muted-foreground)]" />
              <Typography variant="small" className="truncate">{p.title}</Typography>
              <Typography variant="small" color="muted" className="flex-shrink-0">
                {p.conceptCount} {t('dashboard.statConcepts').toLowerCase()}
              </Typography>
            </button>
          ))}
        </Box>
      )}
    </Box>
  );
};

NavSearchBar.displayName = 'NavSearchBar';
