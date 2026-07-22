/**
 * FilterBar molecule — the Home learning-path toolbar.
 * A cluster-filter segmented control (pills) + a sort dropdown, plus an optional
 * result count. Pure controlled component; the page owns the state.
 */

import React from 'react';
import { Box, Button, Typography } from '@almadar/ui';

export interface ClusterOption {
  id: string;
  name: string;
  size: number;
}

export interface FilterBarProps {
  /** Topic clusters (largest-first) — each becomes a filter pill. */
  clusters: ClusterOption[];
  /** Active cluster id, or '' for "All". */
  clusterFilter: string;
  onClusterFilterChange: (value: string) => void;
  /** Translated labels + result count. */
  labels: {
    all: string;
    results: (count: number) => string;
  };
  resultCount: number;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  clusters,
  clusterFilter,
  onClusterFilterChange,
  labels,
  resultCount,
  className,
}) => {
  return (
    <Box className={`flex items-center gap-2 ${className ?? ''}`}>
      {/* Cluster pills — single horizontal scroll row so all clusters stay accessible. */}
      <Box className="flex items-center gap-2 overflow-x-auto flex-nowrap scrollbar-hide min-w-0 flex-1">
        <Button
          size="sm"
          variant={clusterFilter === '' ? 'primary' : 'secondary'}
          onClick={() => onClusterFilterChange('')}
          className="flex-shrink-0 whitespace-nowrap"
        >
          {labels.all}
        </Button>
        {clusters.map((cluster) => (
          <Button
            key={cluster.id}
            size="sm"
            variant={clusterFilter === cluster.id ? 'primary' : 'secondary'}
            onClick={() => onClusterFilterChange(cluster.id)}
            className="flex-shrink-0 whitespace-nowrap"
          >
            {cluster.name}
          </Button>
        ))}
      </Box>
      <Typography variant="small" color="muted" className="whitespace-nowrap flex-shrink-0 hidden lg:block">
        {labels.results(resultCount)}
      </Typography>
    </Box>
  );
};

FilterBar.displayName = 'FilterBar';
