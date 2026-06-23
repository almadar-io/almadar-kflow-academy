/**
 * AchievementsCard Organism
 *
 * Grid of unlocked / locked achievements fetched via getAchievements.
 * Locked entries show a progress bar. Entity-interacting → organism.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Typography,
  Icon,
  Button,
  Badge,
  ProgressBar,
  LoadingState,
  ErrorState,
  EmptyState,
  useTranslate,
} from '@almadar/ui';
import { getAchievements, type Achievement } from '@features/dashboard/preferencesApi';

export function AchievementsCard(): React.JSX.Element | null {
  const { t } = useTranslate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
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

    getAchievements()
      .then((data) => {
        setAchievements(data);
        hasFetchedRef.current = true;
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load achievements';
        console.error('Failed to load achievements:', err);
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
        <LoadingState message={t('dashboard.loadingAchievements')} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="bordered" padding="lg">
        <ErrorState message={`${t('dashboard.errorLoadingAchievements')}: ${error}`} />
      </Card>
    );
  }

  if (achievements.length === 0) {
    return null;
  }

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt > 0);
  const lockedAchievements = achievements.filter((a) => a.unlockedAt === 0);
  const hasUnlocked = unlockedAchievements.length > 0;
  const hasLocked = lockedAchievements.length > 0;

  const displayAchievements = isExpanded ? achievements : unlockedAchievements;

  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <HStack justify="between" align="center">
          <HStack gap="sm" align="center">
            <Icon icon={Award} size="md" className="text-[var(--color-warning)]" />
            <Typography variant="h3" weight="bold">
              {t('dashboard.achievements')}
            </Typography>
            {hasUnlocked && (
              <Badge variant="neutral" label={`${unlockedAchievements.length}/${achievements.length}`} />
            )}
          </HStack>
          {hasLocked && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              <HStack gap="xs" align="center">
                <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" />
                {isExpanded ? t('dashboard.showLess') : t('dashboard.showAll')}
              </HStack>
            </Button>
          )}
        </HStack>
      </CardHeader>
      <CardContent>
        {hasUnlocked ? (
          <SimpleGrid minChildWidth={140} gap="md">
            {displayAchievements.map((achievement) => {
              const isUnlocked = achievement.unlockedAt > 0;
              return (
                <Card
                  key={achievement.id}
                  variant={isUnlocked ? 'bordered' : 'default'}
                  padding="md"
                  className={isUnlocked ? 'border-[var(--color-warning)]' : 'opacity-60'}
                >
                  <VStack gap="xs" align="center">
                    {!isUnlocked && (
                      <Box className="self-end">
                        <Icon icon={Lock} size="xs" color="muted" />
                      </Box>
                    )}
                    <Typography variant="h3" as="span">
                      {achievement.icon}
                    </Typography>
                    <Typography
                      variant="caption"
                      weight="semibold"
                      color={isUnlocked ? 'inherit' : 'muted'}
                    >
                      {achievement.name}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      {achievement.description}
                    </Typography>
                    {!isUnlocked && achievement.progress !== undefined && (
                      <Box className="w-full">
                        <ProgressBar
                          value={Math.min(100, achievement.progress)}
                          max={100}
                          variant="primary"
                          size="sm"
                          showPercentage
                        />
                      </Box>
                    )}
                  </VStack>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          <EmptyState icon="target" message={t('dashboard.unlockAchievementsHint')} />
        )}
      </CardContent>
    </Card>
  );
}
