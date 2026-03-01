/**
 * DashboardPage Library Component
 * 
 * Dashboard page component using DashboardTemplate.
 * Receives data as props - containers handle data fetching and state management.
 */

import React, { useState, useEffect } from 'react';
import { DashboardTemplate, type DashboardActivity } from '../templates/DashboardTemplate';
import { EnhancedStatsCards } from '../organisms/EnhancedStatsCards';
import { DailyGoalsCard } from '../organisms/DailyGoalsCard';
import { RecommendationsCard } from '../organisms/RecommendationsCard';
import { AchievementsCard } from '../organisms/AchievementsCard';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import {
  ArrowRight,
  Plus,
  GraduationCap,
  PlayCircle,
  Clock,
  Loader2,
  CheckCircle,
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
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
  hasLearningPaths?: boolean;
  
  /**
   * Callbacks
   */
  onJumpBackInClick?: (item: JumpBackInItem) => void;
  onCreateLearningPath?: () => void;
  onBrowseCourses?: () => void;
  onMentorStudio?: () => void;
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
  hasLearningPaths = false,
  onJumpBackInClick,
  onCreateLearningPath,
  onBrowseCourses,
  onMentorStudio,
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

  const getActivityIcon = (type: RecentActivity['type']): React.ReactNode => {
    switch (type) {
      case 'course_accessed':
      case 'course_enrolled':
        return <BookOpen size={16} className="text-blue-500" />;
      case 'lesson_completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'concept_studied':
        return <BookMarked size={16} className="text-purple-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getActivityText = (type: RecentActivity['type']): string => {
    switch (type) {
      case 'course_accessed':
        return 'Accessed course';
      case 'course_enrolled':
        return 'Enrolled in course';
      case 'lesson_completed':
        return 'Completed lesson';
      case 'concept_studied':
        return 'Studied concept';
      default:
        return 'Activity';
    }
  };

  // Convert RecentActivity to DashboardActivity for template
  const dashboardActivities: DashboardActivity[] = activities.map(activity => ({
    id: activity.id,
    title: getActivityText(activity.type),
    description: activity.resourceName,
    timestamp: formatTimestamp(activity.timestamp),
  }));

  return (
    <DashboardTemplate
      variant="student"
      user={user}
      navigationItems={navigationItems}
      logo={logo}
      onLogoClick={onLogoClick}
      onLogout={onLogout}
      activities={dashboardActivities}
      quickActions={[
        {
          label: 'New Learning Path',
          icon: Plus,
          onClick: onCreateLearningPath,
          variant: 'primary',
        },
        {
          label: 'Browse Courses',
          icon: BookOpen,
          onClick: onBrowseCourses,
          variant: 'secondary',
        },
        {
          label: 'Mentoring Studio',
          icon: GraduationCap,
          onClick: onMentorStudio,
          variant: 'secondary',
        },
      ]}
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

      {/* Learn Something New CTA */}
      {!hasLearningPaths && (
        <section className="mb-8">
          <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white relative overflow-hidden border-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10 p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Sparkles size={24} />
                    </div>
                    <Typography variant="h2" className="text-white">
                      Ready to Learn Something New?
                    </Typography>
                  </div>
                  <Typography variant="large" className="text-white/90 mb-6 max-w-2xl">
                    Create a personalized learning path tailored to your goals. Our AI will guide you through questions to understand what you want to achieve and build a custom learning journey just for you.
                  </Typography>
                  <Button
                    variant="secondary"
                    onClick={onCreateLearningPath}
                    icon={Target}
                    iconRight={ArrowRight}
                    className="bg-white text-indigo-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    Create Learning Goal
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

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
                      {item.type === 'course' && item.progress ? (
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{item.progress.completedLessons} / {item.progress.totalLessons} lessons</span>
                          <span>•</span>
                          <span>{item.progress.progressPercentage}% complete</span>
                        </div>
                      ) : item.metadata.conceptCount !== undefined ? (
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
                        fullWidth
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
                Start a new learning path or enroll in a course to begin.
              </Typography>
              <div className="flex gap-3 justify-center">
                <Button variant="primary" onClick={onCreateLearningPath}>
                  New Learning Path
                </Button>
                <Button variant="success" onClick={onBrowseCourses}>
                  Browse Courses
                </Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Daily Goals */}
          <section>
            <DailyGoalsCard />
          </section>

          {/* Recent Activity */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-indigo-600 dark:text-indigo-400" size={24} />
              <Typography variant="h3">Recent Activity</Typography>
            </div>

            {isLoadingActivity ? (
              <Card>
                <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400 p-8">
                  <Spinner size="sm" />
                  <Typography variant="body">Loading activity...</Typography>
                </div>
              </Card>
            ) : activities.length > 0 ? (
              <Card>
                <div className="space-y-4">
                  {activities.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onActivityClick?.(item)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        {getActivityIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Typography variant="body" weight="medium" className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {getActivityText(item.type)}
                        </Typography>
                        <Typography variant="small" color="secondary" className="truncate">
                          {item.resourceName}
                        </Typography>
                      </div>
                      <Typography variant="small" color="muted">
                        {formatTimestamp(item.timestamp)}
                      </Typography>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <div className="text-center p-8">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Clock size={24} />
                  </div>
                  <Typography variant="h4" className="mb-1">No recent activity</Typography>
                  <Typography variant="body" color="secondary">
                    Start learning to see your activity here.
                  </Typography>
                </div>
              </Card>
            )}
          </section>

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
