/**
 * Pagination molecule — prev/next + page indicator + item range.
 * Server-side pagination: the page owns `page` and calls onPageChange.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, HStack, Typography } from '@almadar/ui';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  labels: {
    range: (start: number, end: number, total: number) => string;
    page: (page: number, total: number) => string;
  };
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, limit, onPageChange, labels, className }) => {
  if (total === 0) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <HStack justify="between" align="center" wrap className={`gap-3 ${className ?? ''}`}>
      <Typography variant="small" color="muted">
        {labels.range(start, end, total)}
      </Typography>
      <HStack gap="sm" align="center">
        <Button
          size="sm"
          variant="secondary"
          icon={ChevronLeft}
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
        />
        <Typography variant="small" weight="medium" className="min-w-[4rem] text-center">
          {labels.page(page, totalPages)}
        </Typography>
        <Button
          size="sm"
          variant="secondary"
          icon={ChevronRight}
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        />
      </HStack>
    </HStack>
  );
};

Pagination.displayName = 'Pagination';
