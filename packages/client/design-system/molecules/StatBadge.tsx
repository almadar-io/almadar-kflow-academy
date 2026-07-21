/**
 * StatBadge molecule — a compact metric card: tinted icon + big value + label.
 * Composed from @almadar/ui atoms (Card, Icon, Typography). Used for the Home
 * page's aggregate stats (learning paths, concepts, levels).
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Box, Card, HStack, Icon, Typography, VStack } from '@almadar/ui';

export interface StatBadgeProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
}

export const StatBadge: React.FC<StatBadgeProps> = ({ value, label, icon }) => {
  return (
    <Card padding="sm" className="flex-1 min-w-[8rem] flex items-center gap-3">
      {icon && (
        <Box className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-surface text-primary">
          <Icon icon={icon} size="md" />
        </Box>
      )}
      <VStack gap="none">
        <Typography variant="h3" weight="bold" className="leading-none">
          {value}
        </Typography>
        <Typography variant="small" color="muted" className="leading-tight">
          {label}
        </Typography>
      </VStack>
    </Card>
  );
};

StatBadge.displayName = 'StatBadge';
