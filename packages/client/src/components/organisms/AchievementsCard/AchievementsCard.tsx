/**
 * AchievementsCard Organism Component
 * 
 * Displays user achievements with unlock status and progress tracking.
 * Uses Card, Icon, Typography, ProgressBar, Badge atoms and Card molecule.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Spinner } from '../../atoms/Spinner';
import { Button } from '../../atoms/Button';
import { EmptyState } from '../../molecules/EmptyState';
import { Alert } from '../../molecules/Alert';
import { cn } from '../../../utils/theme';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  progress?: number;
}

export interface AchievementsCardProps {
  /**
   * Achievements data
   */
  achievements?: Achievement[];
  
  /**
   * Is loading
   */
  isLoading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * On load achievements (if not provided, achievements prop is used)
   */
  onLoadAchievements?: () => Promise<Achievement[]>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  achievements: providedAchievements,
  isLoading: providedIsLoading = false,
  error: providedError = null,
  onLoadAchievements,
  className,
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>(providedAchievements || []);
  const [isLoading, setIsLoading] = useState(providedIsLoading);
  const [error, setError] = useState<string | null>(providedError);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (providedAchievements) {
      setAchievements(providedAchievements);
      setIsLoading(false);
      return;
    }

    if (!onLoadAchievements || hasFetchedRef.current || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    onLoadAchievements()
      .then((data) => {
        setAchievements(data);
        hasFetchedRef.current = true;
      })
      .catch((err: any) => {
        console.error('Failed to load achievements:', err);
        setError(err.message || 'Failed to load achievements');
      })
      .finally(() => {
        setIsLoading(false);
        isFetchingRef.current = false;
      });
  }, [providedAchievements, onLoadAchievements]);

  const unlockedAchievements = achievements.filter(a => a.unlockedAt > 0);
  const lockedAchievements = achievements.filter(a => a.unlockedAt === 0);
  const hasUnlocked = unlockedAchievements.length > 0;
  const hasLocked = lockedAchievements.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <Card className={className} loading>
        <div className="flex items-center justify-center gap-3 py-8">
          <Spinner size="md" />
          <Typography variant="body" color="secondary">
            Loading achievements...
          </Typography>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <Alert variant="error" title="Error loading achievements">
          {error}
        </Alert>
      </Card>
    );
  }

  // Empty state
  if (achievements.length === 0) {
    return null;
  }

  // Show only unlocked achievements when collapsed, all when expanded
  const displayAchievements = isExpanded ? achievements : unlockedAchievements;

  return (
    <Card
      className={className}
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
              <Icon icon={Award} size="md" />
            </div>
            <Typography variant="h6">Achievements</Typography>
            {hasUnlocked && (
              <Typography variant="body" color="secondary" className="text-sm">
                ({unlockedAchievements.length}/{achievements.length})
              </Typography>
            )}
          </div>
          {hasLocked && (
            <Button
              variant="ghost"
              size="sm"
              icon={isExpanded ? ChevronUp : ChevronDown}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show Less' : 'Show All'}
            </Button>
          )}
        </div>
      }
    >
      {/* Content */}
      {hasUnlocked ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {displayAchievements.map((achievement) => {
            const isUnlocked = achievement.unlockedAt > 0;
            return (
              <div
                key={achievement.id}
                className={cn(
                  'relative p-4 rounded-lg border-2 transition-all',
                  isUnlocked
                    ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 opacity-60'
                )}
              >
                {!isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Icon icon={Lock} size="sm" color="text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <Typography
                    variant="body"
                    className={cn(
                      'text-xs font-semibold mb-1',
                      isUnlocked
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {achievement.name}
                  </Typography>
                  <Typography variant="body" color="secondary" className="text-xs line-clamp-2">
                    {achievement.description}
                  </Typography>
                  {!isUnlocked && achievement.progress !== undefined && (
                    <div className="mt-2">
                      <ProgressBar
                        value={Math.min(100, achievement.progress)}
                        size="sm"
                      />
                      <Typography variant="body" color="secondary" className="text-xs mt-1">
                        {Math.round(achievement.progress)}%
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No achievements yet"
          description="Complete lessons and courses to unlock achievements!"
        >
          <div className="text-4xl mb-2">🎯</div>
        </EmptyState>
      )}
    </Card>
  );
};

AchievementsCard.displayName = 'AchievementsCard';
