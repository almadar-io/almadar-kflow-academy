/**
 * FilterBar molecule — the Home learning-path toolbar.
 * A level-filter segmented control (pills) + a sort dropdown, plus an optional
 * result count. Pure controlled component; the page owns the state.
 */

import React from 'react';
import { Box, Button, HStack, Select, Typography } from '@almadar/ui';
import type { SelectOption } from '@almadar/ui';

export type LevelFilterValue = 'all' | '1' | '2-3' | '4plus';
export type SortValue = 'recent' | 'oldest' | 'az' | 'za';

export interface FilterBarProps {
  levelFilter: LevelFilterValue;
  onLevelFilterChange: (value: LevelFilterValue) => void;
  sort: SortValue;
  onSortChange: (value: SortValue) => void;
  /** Translated pill labels + result count. */
  labels: {
    all: string;
    one: string;
    twoThree: string;
    fourPlus: string;
    sortLabel: string;
    results: (count: number) => string;
  };
  resultCount: number;
  sortOptions: SelectOption[];
  className?: string;
}

const LEVEL_PILLS: Array<{ value: LevelFilterValue; key: 'all' | 'one' | 'twoThree' | 'fourPlus' }> = [
  { value: 'all', key: 'all' },
  { value: '1', key: 'one' },
  { value: '2-3', key: 'twoThree' },
  { value: '4plus', key: 'fourPlus' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  levelFilter,
  onLevelFilterChange,
  sort,
  onSortChange,
  labels,
  resultCount,
  sortOptions,
  className,
}) => {
  return (
    <HStack justify="between" align="center" wrap className={`gap-3 ${className ?? ''}`}>
      <HStack gap="sm" wrap align="center">
        {LEVEL_PILLS.map((pill) => (
          <Button
            key={pill.value}
            size="sm"
            variant={levelFilter === pill.value ? 'primary' : 'secondary'}
            onClick={() => onLevelFilterChange(pill.value)}
          >
            {labels[pill.key]}
          </Button>
        ))}
        <Typography variant="small" color="muted" className="ml-2 hidden sm:block">
          {labels.results(resultCount)}
        </Typography>
      </HStack>
      <Box className="flex items-center gap-2 min-w-[12rem]">
        <Typography variant="small" color="muted" className="whitespace-nowrap">
          {labels.sortLabel}
        </Typography>
        <Box className="flex-1">
          <Select
            value={sort}
            options={sortOptions}
            onValueChange={(v) => onSortChange(v as SortValue)}
          />
        </Box>
      </Box>
    </HStack>
  );
};

FilterBar.displayName = 'FilterBar';
