/**
 * DashboardPage Library Component
 * 
 * Dashboard page component using DashboardTemplate.
 * Receives data as props - containers handle data fetching and state management.
 */

import React, { useState, useEffect } from 'react';
import { DashboardTemplate, type DashboardActivity } from '../templates/DashboardTemplate';
import { EnhancedStatsCards } from '../organisms/EnhancedStatsCards';

import { RecommendationsCard } from '../organisms/RecommendationsCard';
import { AchievementsCard } from '../organisms/AchievementsCard';
import { Button, Typography, Spinner } from '@almadar/ui';
import { Card } from '../molecules/Card';
import {
  ArrowRight,
  Plus,
  PlayCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { JumpBackInItem } from '../../features/dashboard/preferencesApi';
import type { RecentActivity } from '../../features/dashboard/statisticsApi';
import type { LucideIcon } from 'lucide-react';

export interface DashboardPageProps {
  /**
   * User display name
   */
  userName?: string;
  
  /**
   * Jump back in items
   */
  jumpBackInItems?: JumpBackInItem[];
  
  /**
   * Loading state for jump back in items
   */
  isLoadingJumpBackIn?: boolean;
  
  /**
   * Recent activity items
   */
  activities?: RecentActivity[];
  
  /**
   * Loading state for activities
   */
  isLoadingActivity?: boolean;
  
  /**
   * Format timestamp function
   */
  formatTimestamp?: (timestamp: number) => string;
  
  /**
   * Whether user has learning paths
   */
  /**
   * Callbacks
   */
  onJumpBackInClick?: (item: JumpBackInItem) => void;
  onCreateLearningPath?: () => void;
  onBrowseStories?: () => void;
  onActivityClick?: (activity: RecentActivity) => void;
  
  /**
   * Template props
   */
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  logo?: React.ReactNode;
  onLogoClick?: () => void;
  onLogout?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  userName,
  jumpBackInItems = [],
  isLoadingJumpBackIn = false,
  activities = [],
  isLoadingActivity = false,
  formatTimestamp = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  },
  onJumpBackInClick,
  onCreateLearningPath,
  onBrowseStories,
  onActivityClick,
  user,
  navigationItems,
  logo,
  onLogoClick,
  onLogout,
}) => {
  const [currentJumpBackInIndex, setCurrentJumpBackInIndex] = useState(0);

  // Reset index when items change
  useEffect(() => {
    if (jumpBackInItems.length > 0 && currentJumpBackInIndex >= jumpBackInItems.length) {
      setCurrentJumpBackInIndex(0);
    }
  }, [jumpBackInItems.length, currentJumpBackInIndex]);

  const handleJumpBackInClick = (item: JumpBackInItem) => {
    onJumpBackInClick?.(item);
  };

  return (
    <DashboardTemplate
      variant="student"
      user={user}
      navigationItems={navigationItems}
      logo={logo}
      onLogoClick={onLogoClick}
      onLogout={onLogout}
      activities={[]}
      quickActions={[]}
    >
      {/* Welcome Section */}
      <div className="mb-8">
        <Typography variant="h1" className="mb-2">
          Welcome back, {userName?.split(' ')[0] || 'User'}!
        </Typography>
        <Typography variant="body" color="secondary">
          Ready to continue your learning journey?
        </Typography>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="mb-8">
        <EnhancedStatsCards />
      </div>

      {/* Jump Back In */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className="text-indigo-600 dark:text-indigo-400" size={24} />
          <Typography variant="h3">Jump Back In</Typography>
        </div>

        {isLoadingJumpBackIn ? (
          <Card>
            <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400 p-8">
              <Spinner size="sm" />
              <Typography variant="body">Loading...</Typography>
            </div>
          </Card>
        ) : jumpBackInItems.length > 0 ? (
          <div className="relative">
            <Card>
              {(() => {
                const item = jumpBackInItems[currentJumpBackInIndex];
                return (
                  <div
                    onClick={() => handleJumpBackInClick(item)}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <Typography variant="small" className="text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wide">
                          {item.type === 'course' ? 'Continue Course' : 'Continue Learning'}
                        </Typography>
                        <Typography variant="h4" className="mb-2 line-clamp-2">
                          {item.title}
                        </Typography>
                        {item.description && (
                          <Typography variant="body" color="secondary" className="line-clamp-2 mb-4">
                            {item.description}
                          </Typography>
                        )}
                      </div>
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex-shrink-0 ml-2">
                        <Clock size={20} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {item.metadata.conceptCount !== undefined ? (
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{item.metadata.conceptCount} concepts</span>
                          {item.metadata.levelCount !== undefined && (
                            <>
                              <span>•</span>
                              <span>{item.metadata.levelCount} levels</span>
                            </>
                          )}
                        </div>
                      ) : null}
                      <Button
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpBackInClick(item);
                        }}
                        iconRight={ArrowRight}
                        className="w-full"
                      >
                        {item.type === 'course' ? 'Continue Course' : 'Resume Learning'}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Navigation buttons */}
            {jumpBackInItems.length > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCurrentJumpBackInIndex((prev) => 
                      prev > 0 ? prev - 1 : jumpBackInItems.length - 1
                    );
                  }}
                  disabled={jumpBackInItems.length <= 1}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {jumpBackInItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentJumpBackInIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentJumpBackInIndex
                          ? 'bg-indigo-600 dark:bg-indigo-400'
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                      aria-label={`Go to item ${index + 1}`}
                    />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setCurrentJumpBackInIndex((prev) => 
                      prev < jumpBackInItems.length - 1 ? prev + 1 : 0
                    );
                  }}
                  disabled={jumpBackInItems.length <= 1}
                  iconRight={ChevronRight}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <div className="text-center p-8">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                <BookOpen size={24} />
              </div>
              <Typography variant="h4" className="mb-1">No active learning</Typography>
              <Typography variant="body" color="secondary" className="mb-4">
                Start a new learning path or browse stories to begin.
              </Typography>
              <div className="flex gap-3 justify-center">
                <Button variant="primary" onClick={onCreateLearningPath}>
                  New Learning Path
                </Button>
                <Button variant="success" onClick={onBrowseStories}>
                  Browse Stories
                </Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recommendations */}
          <section>
            <RecommendationsCard />
          </section>

          {/* Achievements */}
          <section>
            <AchievementsCard />
          </section>
        </div>

        {/* Sidebar Column - Quick Actions are handled by DashboardTemplate */}
      </div>
    </DashboardTemplate>
  );
};

DashboardPage.displayName = 'DashboardPage';
