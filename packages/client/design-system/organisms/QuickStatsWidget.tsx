/**
 * QuickStatsWidget Organism
 *
 * Collapsible grid of quick learning stats fetched from
 * statisticsApi.getDetailedStatistics. Entity-interacting → organism.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle as CheckCircleIcon,
  GraduationCap as GraduationCapIcon,
  Trophy as TrophyIcon,
  Flame as FlameIcon,
  BookOpen as BookOpenIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  HStack,
  SimpleGrid,
  Typography,
  Icon,
  Button,
  LoadingState,
  useTranslate,
} from '@almadar/ui';
import {
  statisticsApi,
  type DetailedStatistics,
} from '@features/dashboard/statisticsApi';

interface QuickStat {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconClass: string;
}

export function QuickStatsWidget(): React.JSX.Element | null {
  const { t } = useTranslate();
  const [stats, setStats] = useState<DetailedStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    statisticsApi
      .getDetailedStatistics()
      .then((data) => {
        setStats(data);
        hasFetchedRef.current = true;
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load statistics';
        console.error('Failed to load detailed statistics:', err);
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
        isFetchingRef.current = false;
      });
  }, []);

  if (isLoading) {
    return (
      <Card variant="bordered" padding="lg">
        <LoadingState message={t('dashboard.loadingStats')} />
      </Card>
    );
  }

  if (error || !stats) {
    return null;
  }

  const summaryStats: QuickStat[] = [
    { label: t('dashboard.lessonsCompleted'), value: stats.lessonsCompleted, icon: CheckCircleIcon, iconClass: 'text-[var(--color-success)]' },
    { label: t('dashboard.coursesCompleted'), value: stats.coursesCompleted, icon: GraduationCapIcon, iconClass: 'text-[var(--color-info)]' },
    { label: t('dashboard.stat.concepts'), value: stats.conceptsMastered, icon: TrophyIcon, iconClass: 'text-[var(--color-warning)]' },
  ];

  const allStats: QuickStat[] = [
    ...summaryStats,
    { label: t('dashboard.stat.streak'), value: `${stats.learningStreak} days`, icon: FlameIcon, iconClass: 'text-[var(--color-warning)]' },
    { label: t('dashboard.activeCourses'), value: stats.activeCourses, icon: BookOpenIcon, iconClass: 'text-[var(--color-primary)]' },
  ];

  const displayStats = isExpanded ? allStats : summaryStats;

  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <HStack justify="between" align="center">
          <Typography variant="h3" weight="bold">
            {t('dashboard.quickStats')}
          </Typography>
          {allStats.length > summaryStats.length && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              <HStack gap="xs" align="center">
                <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" />
                {isExpanded ? t('dashboard.showLess') : t('dashboard.showMore')}
              </HStack>
            </Button>
          )}
        </HStack>
      </CardHeader>
      <CardContent>
        <SimpleGrid minChildWidth={180} gap="md">
          {displayStats.map((stat) => (
            <Card key={stat.label} variant="default" padding="sm">
              <HStack gap="sm" align="center">
                <Icon icon={stat.icon} size="md" className={stat.iconClass} />
                <Box>
                  <Typography variant="h4" weight="bold">
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {stat.label}
                  </Typography>
                </Box>
              </HStack>
            </Card>
          ))}
        </SimpleGrid>
      </CardContent>
    </Card>
  );
}
