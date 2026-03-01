import React, { useState, useEffect, useRef } from 'react';
import { Award, Lock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getAchievements, type Achievement } from '../preferencesApi';

export const AchievementsCard: React.FC = () => {
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
      .catch((err: any) => {
        console.error('Failed to load achievements:', err);
        setError(err.message || 'Failed to load achievements');
      })
      .finally(() => {
        setIsLoading(false);
        isFetchingRef.current = false;
      });
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading achievements...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Error loading achievements: {error}
        </div>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlockedAt > 0);
  const lockedAchievements = achievements.filter(a => a.unlockedAt === 0);
  const hasUnlocked = unlockedAchievements.length > 0;
  const hasLocked = lockedAchievements.length > 0;

  // Don't show if no achievements at all
  if (achievements.length === 0) {
    return null;
  }

  // Show only unlocked achievements when collapsed, all when expanded
  const displayAchievements = isExpanded ? achievements : unlockedAchievements;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
            <Award size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Achievements</h3>
          {hasUnlocked && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({unlockedAchievements.length}/{achievements.length})
            </span>
          )}
        </div>
        {hasLocked && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Show All
              </>
            )}
          </button>
        )}
      </div>

      {hasUnlocked ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {displayAchievements.map((achievement) => {
            const isUnlocked = achievement.unlockedAt > 0;
            return (
              <div
                key={achievement.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isUnlocked
                    ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 opacity-60'
                }`}
              >
                {!isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock size={14} className="text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div
                    className={`text-xs font-semibold mb-1 ${
                      isUnlocked
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {achievement.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {achievement.description}
                  </div>
                  {!isUnlocked && achievement.progress !== undefined && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, achievement.progress)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {Math.round(achievement.progress)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete lessons and courses to unlock achievements!
          </p>
        </div>
      )}
    </div>
  );
};

