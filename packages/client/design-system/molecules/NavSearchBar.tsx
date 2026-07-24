/**
 * NavSearchBar molecule — top-nav search with autocomplete.
 *
 * Uses Input directly (not SearchInput) so the autocomplete dropdown filters
 * on every keystroke, not after a debounce. The debounced onChange still
 * drives server-side card-list filtering; the immediate inputValue drives
 * the dropdown.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { Icon as IconifyIcon } from '@iconify/react';
import { Box, Input, Typography, cn, useEventBus, useTranslate } from '@almadar/ui';
import { useLearningPaths } from '@features/knowledge-graph/hooks/useLearningPaths';
import { useConceptIcon } from '@features/knowledge-graph/hooks/useConceptIcon';
import type { LearningPathSummary } from '@features/knowledge-graph/api/types';

export interface NavSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Single result row — needs its own component to call useConceptIcon (hook). */
const SearchResult: React.FC<{
  path: LearningPathSummary;
  onSelect: (graphId: string) => void;
}> = ({ path, onSelect }) => {
  const { t } = useTranslate();
  const iconId = useConceptIcon(path.seedConcept?.name ?? path.title);
  const date = new Date(path.updatedAt);
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Box
      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-[var(--color-muted)] transition-colors"
      onClick={() => onSelect(path.id)}
    >
      <Box className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)]">
        {iconId ? (
          <IconifyIcon icon={iconId.icon} width={16} height={16} />
        ) : (
          <BookOpen size={14} className="text-[var(--color-muted-foreground)]" />
        )}
      </Box>
      <Box className="min-w-0 flex-1">
        <Typography variant="small" className="truncate">{path.title}</Typography>
        <Typography variant="small" color="muted" className="truncate text-xs">
          {path.conceptCount} {t('dashboard.statConcepts').toLowerCase()} · {dateLabel}
        </Typography>
      </Box>
    </Box>
  );
};

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
          className="absolute top-full start-0 z-50 mt-1 w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((p) => (
            <SearchResult key={p.id} path={p} onSelect={handleSelect} />
          ))}
        </Box>
      )}
    </Box>
  );
};

NavSearchBar.displayName = 'NavSearchBar';
