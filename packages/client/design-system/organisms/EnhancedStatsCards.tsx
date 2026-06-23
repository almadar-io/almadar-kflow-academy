/**
 * EnhancedStatsCards Organism
 *
 * Primary learning stats (streak / concepts / active courses) with an
 * expandable row of detailed stats. Entity-interacting → organism.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Trophy,
  BookOpen,
  CheckCircle,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Info,
  type LucideIcon,
} from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Typography,
  Icon,
  Button,
  Tooltip,
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  useTranslate,
} from '@almadar/ui';
import {
  statisticsApi,
  type DetailedStatistics,
} from '@features/dashboard/statisticsApi';
import { useDashboardStats } from '@features/dashboard/hooks/useDashboardStats';

interface EnhancedStat {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  tooltip: string;
}

function StatTile({ stat }: { stat: EnhancedStat }): React.JSX.Element {
  return (
    <Box className="relative">
      <StatCard
        title={stat.label}
        value={stat.value}
        icon={stat.icon}
        iconColor={stat.iconClass}
      />
      <Box className="absolute right-3 top-3">
        <Tooltip content={stat.tooltip}>
          <Icon icon={Info} size="sm" color="muted" />
        </Tooltip>
      </Box>
    </Box>
  );
}

export function EnhancedStatsCards(): React.JSX.Element {
  const { t } = useTranslate();
  const { stats, isLoading: isLoadingStats, error: statsError } = useDashboardStats();
  const [detailedStats, setDetailedStats] = useState<DetailedStatistics | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFetchedDetailsRef = useRef(false);
  const isFetchingDetailsRef = useRef(false);

  useEffect(() => {
    if (isExpanded && !hasFetchedDetailsRef.current && !isFetchingDetailsRef.current) {
      isFetchingDetailsRef.current = true;
      setIsLoadingDetails(true);

      statisticsApi
        .getDetailedStatistics()
        .then((data) => {
          setDetailedStats(data);
          hasFetchedDetailsRef.current = true;
        })
        .catch((err) => {
          console.error('Failed to load detailed statistics:', err);
        })
        .finally(() => {
          setIsLoadingDetails(false);
          isFetchingDetailsRef.current = false;
        });
    }
  }, [isExpanded]);

  const mainStatsCards: EnhancedStat[] = [
    { label: t('dashboard.stat.streak'), value: stats.learningStreak.toString(), icon: Flame, iconClass: 'text-[var(--color-warning)]', tooltip: t('dashboard.stat.streakTooltip') },
    { label: t('dashboard.stat.concepts'), value: stats.conceptsMastered.toString(), icon: Trophy, iconClass: 'text-[var(--color-warning)]', tooltip: t('dashboard.stat.conceptsTooltip') },
    { label: t('dashboard.activeCourses'), value: stats.activeCourses.toString(), icon: BookOpen, iconClass: 'text-[var(--color-info)]', tooltip: t('dashboard.stat.activeCoursesTooltip') },
  ];

  const additionalStats: EnhancedStat[] = detailedStats
    ? [
        { label: t('dashboard.lessonsCompleted'), value: detailedStats.lessonsCompleted.toString(), icon: CheckCircle, iconClass: 'text-[var(--color-success)]', tooltip: t('dashboard.stat.lessonsCompletedTooltip') },
        { label: t('dashboard.coursesCompleted'), value: detailedStats.coursesCompleted.toString(), icon: GraduationCap, iconClass: 'text-[var(--color-primary)]', tooltip: t('dashboard.stat.coursesCompletedTooltip') },
      ]
    : [];

  if (isLoadingStats) {
    return <LoadingState message={t('dashboard.loadingStats')} />;
  }

  if (statsError) {
    return <ErrorState message={`${t('dashboard.errorLoadingStats')}: ${statsError}`} />;
  }

  return (
    <VStack gap="md">
      <SimpleGrid minChildWidth={220} gap="md">
        {mainStatsCards.map((stat) => (
          <StatTile key={stat.label} stat={stat} />
        ))}
      </SimpleGrid>

      <HStack justify="center">
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          <HStack gap="xs" align="center">
            <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" />
            {isExpanded ? t('dashboard.showLess') : t('dashboard.showMoreStats')}
          </HStack>
        </Button>
      </HStack>

      {isExpanded &&
        (isLoadingDetails ? (
          <LoadingState message={t('dashboard.loadingAdditionalStats')} />
        ) : additionalStats.length > 0 ? (
          <SimpleGrid minChildWidth={260} gap="md">
            {additionalStats.map((stat) => (
              <StatTile key={stat.label} stat={stat} />
            ))}
          </SimpleGrid>
        ) : (
          <EmptyState message={t('dashboard.noAdditionalStats')} />
        ))}
    </VStack>
  );
}
