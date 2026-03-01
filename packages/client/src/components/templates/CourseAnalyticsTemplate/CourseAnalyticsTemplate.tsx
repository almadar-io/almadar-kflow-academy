/**
 * CourseAnalyticsTemplate Component
 * 
 * Analytics dashboard for mentors showing detailed course metrics,
 * student progress, language usage, and lesson performance.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Users,
  GraduationCap,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Globe,
  AlertTriangle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { MentorAnalyticsPanel } from '../../organisms/MentorAnalyticsPanel';
import { StudentProgressCard } from '../../organisms/StudentProgressCard';
import { StatCard } from '../../molecules/StatCard';
import { Card } from '../../molecules/Card';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { SelectDropdown } from '../../molecules/SelectDropdown';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { EmptyState } from '../../molecules/EmptyState';
import { cn } from '../../../utils/theme';

export interface LessonAnalytics {
  /**
   * Lesson ID
   */
  id: string;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * Module/Level name
   */
  moduleName: string;
  
  /**
   * View count
   */
  views: number;
  
  /**
   * Completion count
   */
  completions: number;
  
  /**
   * Completion rate (0-100)
   */
  completionRate: number;
  
  /**
   * Average time spent (minutes)
   */
  avgTimeSpent: number;
  
  /**
   * Drop-off rate (0-100)
   */
  dropOffRate: number;
  
  /**
   * Average quiz score (0-100)
   */
  avgQuizScore?: number;
}

export interface StudentAnalyticsData {
  /**
   * Student ID
   */
  id: string;
  
  /**
   * Student name
   */
  name: string;
  
  /**
   * Student email
   */
  email?: string;
  
  /**
   * Avatar URL
   */
  avatarUrl?: string;
  
  /**
   * Progress (0-100)
   */
  progress: number;
  
  /**
   * Lessons completed
   */
  lessonsCompleted: number;
  
  /**
   * Total lessons
   */
  totalLessons: number;
  
  /**
   * Last activity
   */
  lastActivity?: Date | string;
  
  /**
   * Enrolled date
   */
  enrolledAt?: Date | string;
  
  /**
   * Time spent (minutes)
   */
  timeSpent?: number;
  
  /**
   * Average quiz score
   */
  avgQuizScore?: number;
  
  /**
   * Is completed
   */
  isCompleted?: boolean;
  
  /**
   * Has certificate
   */
  hasCertificate?: boolean;
  
  /**
   * Engagement score (0-100)
   */
  engagementScore?: number;
  
  /**
   * Is at risk
   */
  isAtRisk?: boolean;
}

export interface LanguageUsageData {
  /**
   * Language code
   */
  language: string;
  
  /**
   * Language name
   */
  name: string;
  
  /**
   * Student count
   */
  studentCount: number;
  
  /**
   * Percentage
   */
  percentage: number;
}

export interface CourseAnalyticsTemplateProps {
  /**
   * Course title
   */
  courseTitle: string;
  
  /**
   * Course ID
   */
  courseId: string;
  
  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  
  /**
   * Total enrollments
   */
  totalEnrollments: number;
  
  /**
   * Enrollment change percentage
   */
  enrollmentChange?: number;
  
  /**
   * Active students (last 7 days)
   */
  activeStudents: number;
  
  /**
   * Active change percentage
   */
  activeChange?: number;
  
  /**
   * Completion rate (0-100)
   */
  completionRate: number;
  
  /**
   * Completion change percentage
   */
  completionChange?: number;
  
  /**
   * Average rating (0-5)
   */
  averageRating?: number;
  
  /**
   * Rating count
   */
  ratingCount?: number;
  
  /**
   * Average completion time (hours)
   */
  avgCompletionTime?: number;
  
  /**
   * Total lessons completed by all students
   */
  totalLessonsCompleted?: number;
  
  /**
   * At-risk student count
   */
  atRiskStudents?: number;
  
  /**
   * Lesson analytics data
   */
  lessonAnalytics?: LessonAnalytics[];
  
  /**
   * Student analytics data
   */
  studentAnalytics?: StudentAnalyticsData[];
  
  /**
   * Language usage data
   */
  languageUsage?: LanguageUsageData[];
  
  /**
   * Time range options
   */
  timeRangeOptions?: Array<{ value: string; label: string }>;
  
  /**
   * Current time range
   */
  timeRange?: string;
  
  /**
   * On time range change
   */
  onTimeRangeChange?: (value: string) => void;
  
  /**
   * On export data
   */
  onExport?: (format: 'csv' | 'pdf') => void;
  
  /**
   * On refresh data
   */
  onRefresh?: () => void;
  
  /**
   * Is refreshing
   */
  isRefreshing?: boolean;
  
  /**
   * On back navigation
   */
  onBack?: () => void;
  
  /**
   * On view student details
   */
  onViewStudent?: (studentId: string) => void;
  
  /**
   * On message student
   */
  onMessageStudent?: (studentId: string) => void;
  
  /**
   * On view lesson details
   */
  onViewLesson?: (lessonId: string) => void;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const LessonRow: React.FC<{
  lesson: LessonAnalytics;
  onClick?: () => void;
}> = ({ lesson, onClick }) => (
  <tr 
    className={cn(
      'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      onClick && 'cursor-pointer'
    )}
    onClick={onClick}
  >
    <td className="py-3 px-4">
      <div>
        <Typography variant="small" weight="medium">{lesson.title}</Typography>
        <Typography variant="small" color="secondary">{lesson.moduleName}</Typography>
      </div>
    </td>
    <td className="py-3 px-4 text-center">
      <Typography variant="small">{formatNumber(lesson.views)}</Typography>
    </td>
    <td className="py-3 px-4 text-center">
      <Typography variant="small">{formatNumber(lesson.completions)}</Typography>
    </td>
    <td className="py-3 px-4">
      <div className="flex items-center gap-2">
        <ProgressBar value={lesson.completionRate} size="sm" className="w-16" />
        <Typography variant="small">{lesson.completionRate}%</Typography>
      </div>
    </td>
    <td className="py-3 px-4 text-center">
      <Typography variant="small">{lesson.avgTimeSpent}m</Typography>
    </td>
    <td className="py-3 px-4 text-center">
      <Badge 
        variant={lesson.dropOffRate > 30 ? 'danger' : lesson.dropOffRate > 15 ? 'warning' : 'success'}
        size="sm"
      >
        {lesson.dropOffRate}%
      </Badge>
    </td>
    {lesson.avgQuizScore !== undefined && (
      <td className="py-3 px-4 text-center">
        <Typography variant="small">{lesson.avgQuizScore}%</Typography>
      </td>
    )}
  </tr>
);

export const CourseAnalyticsTemplate: React.FC<CourseAnalyticsTemplateProps> = ({
  courseTitle,
  courseId,
  user,
  navigationItems = [],
  totalEnrollments,
  enrollmentChange,
  activeStudents,
  activeChange,
  completionRate,
  completionChange,
  averageRating,
  ratingCount,
  avgCompletionTime,
  totalLessonsCompleted,
  atRiskStudents = 0,
  lessonAnalytics = [],
  studentAnalytics = [],
  languageUsage = [],
  timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
  ],
  timeRange = '30d',
  onTimeRangeChange,
  onExport,
  onRefresh,
  isRefreshing = false,
  onBack,
  onViewStudent,
  onMessageStudent,
  onViewLesson,
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [studentFilter, setStudentFilter] = useState<'all' | 'active' | 'at-risk' | 'completed'>('all');

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', content: null },
    { id: 'students', label: 'Students', content: null, badge: totalEnrollments },
    { id: 'lessons', label: 'Lesson Performance', content: null },
    { id: 'languages', label: 'Languages', content: null },
  ];

  const filteredStudents = studentAnalytics.filter(student => {
    if (studentFilter === 'all') return true;
    if (studentFilter === 'active') return !student.isCompleted && student.progress > 0;
    if (studentFilter === 'at-risk') return student.isAtRisk;
    if (studentFilter === 'completed') return student.isCompleted;
    return true;
  });

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      className={className}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>
                Back
              </Button>
            )}
            <div>
              <Typography variant="h4">{courseTitle}</Typography>
              <Typography variant="small" color="secondary">
                Course Analytics
              </Typography>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <SelectDropdown
              options={timeRangeOptions}
              value={timeRange}
              onChange={(v) => onTimeRangeChange?.(Array.isArray(v) ? v[0] : v)}
              className="w-36"
            />
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="sm" 
                icon={RefreshCw} 
                onClick={onRefresh}
                disabled={isRefreshing}
                className={isRefreshing ? 'animate-spin' : ''}
              >
                <span className="sr-only">Refresh</span>
              </Button>
            )}
            {onExport && (
              <Button variant="secondary" size="sm" icon={Download} onClick={() => onExport('csv')}>
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Enrollments"
            value={totalEnrollments}
            icon={Users}
            change={enrollmentChange !== undefined ? `${enrollmentChange > 0 ? '+' : ''}${enrollmentChange}%` : undefined}
            changeType={enrollmentChange !== undefined ? (enrollmentChange >= 0 ? 'positive' : 'negative') : undefined}
          />
          <StatCard
            label="Active Students"
            value={activeStudents}
            icon={TrendingUp}
            change={activeChange !== undefined ? `${activeChange > 0 ? '+' : ''}${activeChange}%` : undefined}
            changeType={activeChange !== undefined ? (activeChange >= 0 ? 'positive' : 'negative') : undefined}
          />
          <StatCard
            label="Completion Rate"
            value={`${completionRate}%`}
            icon={GraduationCap}
            change={completionChange !== undefined ? `${completionChange > 0 ? '+' : ''}${completionChange}%` : undefined}
            changeType={completionChange !== undefined ? (completionChange >= 0 ? 'positive' : 'negative') : undefined}
          />
          <StatCard
            label="At-Risk Students"
            value={atRiskStudents}
            icon={AlertTriangle}
          />
        </div>

        {/* Tabs */}
        <Tabs
          items={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MentorAnalyticsPanel
              courseTitle={courseTitle}
              totalEnrollments={totalEnrollments}
              enrollmentChange={enrollmentChange}
              activeStudents={activeStudents}
              activeChange={activeChange}
              completionRate={completionRate}
              completionChange={completionChange}
              averageRating={averageRating}
              ratingCount={ratingCount}
              avgCompletionTime={avgCompletionTime}
              totalLessonsCompleted={totalLessonsCompleted}
              languageStats={languageUsage.map(l => ({
                language: l.language,
                name: l.name,
                studentCount: l.studentCount,
                percentage: l.percentage,
              }))}
              periodLabel={timeRangeOptions.find(o => o.value === timeRange)?.label || timeRange}
            />
            
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <Typography variant="h6" className="mb-4">Top Performing Lessons</Typography>
                {lessonAnalytics.length > 0 ? (
                  <div className="space-y-3">
                    {lessonAnalytics
                      .sort((a, b) => b.completionRate - a.completionRate)
                      .slice(0, 5)
                      .map((lesson) => (
                        <div 
                          key={lesson.id} 
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
                          onClick={() => onViewLesson?.(lesson.id)}
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <Typography variant="small" weight="medium" className="truncate">
                              {lesson.title}
                            </Typography>
                            <Typography variant="small" color="secondary">
                              {lesson.moduleName}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-2">
                            <ProgressBar value={lesson.completionRate} size="sm" className="w-20" />
                            <Typography variant="small">{lesson.completionRate}%</Typography>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <Typography variant="small" color="secondary">No lesson data available</Typography>
                )}
              </Card>
              
              <Card>
                <Typography variant="h6" className="mb-4">Recent Completers</Typography>
                {studentAnalytics.filter(s => s.isCompleted).length > 0 ? (
                  <div className="space-y-2">
                    {studentAnalytics
                      .filter(s => s.isCompleted)
                      .slice(0, 5)
                      .map((student) => (
                        <StudentProgressCard
                          key={student.id}
                          id={student.id}
                          name={student.name}
                          avatarUrl={student.avatarUrl}
                          progress={student.progress}
                          lessonsCompleted={student.lessonsCompleted}
                          totalLessons={student.totalLessons}
                          isCompleted={student.isCompleted}
                          hasCertificate={student.hasCertificate}
                          variant="compact"
                          onViewDetails={onViewStudent ? () => onViewStudent(student.id) : undefined}
                        />
                      ))}
                  </div>
                ) : (
                  <Typography variant="small" color="secondary">No completions yet</Typography>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={studentFilter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStudentFilter('all')}
                >
                  All ({studentAnalytics.length})
                </Button>
                <Button
                  variant={studentFilter === 'active' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStudentFilter('active')}
                >
                  Active ({studentAnalytics.filter(s => !s.isCompleted && s.progress > 0).length})
                </Button>
                <Button
                  variant={studentFilter === 'at-risk' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStudentFilter('at-risk')}
                >
                  <Icon icon={AlertTriangle} size="sm" className="mr-1 text-orange-500" />
                  At Risk ({studentAnalytics.filter(s => s.isAtRisk).length})
                </Button>
                <Button
                  variant={studentFilter === 'completed' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStudentFilter('completed')}
                >
                  <Icon icon={CheckCircle} size="sm" className="mr-1 text-green-500" />
                  Completed ({studentAnalytics.filter(s => s.isCompleted).length})
                </Button>
              </div>
            </div>
            
            {filteredStudents.length > 0 ? (
              <div className="space-y-4">
                {filteredStudents.map((student) => (
                  <StudentProgressCard
                    key={student.id}
                    id={student.id}
                    name={student.name}
                    email={student.email}
                    avatarUrl={student.avatarUrl}
                    progress={student.progress}
                    lessonsCompleted={student.lessonsCompleted}
                    totalLessons={student.totalLessons}
                    lastActivity={student.lastActivity}
                    enrolledAt={student.enrolledAt}
                    timeSpent={student.timeSpent}
                    avgQuizScore={student.avgQuizScore}
                    isCompleted={student.isCompleted}
                    hasCertificate={student.hasCertificate}
                    variant="detailed"
                    onViewDetails={onViewStudent ? () => onViewStudent(student.id) : undefined}
                    onSendMessage={onMessageStudent ? () => onMessageStudent(student.id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No students found"
                description="No students match the selected filter"
              />
            )}
          </div>
        )}

        {/* Lessons Tab */}
        {activeTab === 'lessons' && (
          <Card>
            {lessonAnalytics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4">
                        <Typography variant="small" weight="semibold">Lesson</Typography>
                      </th>
                      <th className="text-center py-3 px-4">
                        <Typography variant="small" weight="semibold">Views</Typography>
                      </th>
                      <th className="text-center py-3 px-4">
                        <Typography variant="small" weight="semibold">Completions</Typography>
                      </th>
                      <th className="text-left py-3 px-4">
                        <Typography variant="small" weight="semibold">Completion Rate</Typography>
                      </th>
                      <th className="text-center py-3 px-4">
                        <Typography variant="small" weight="semibold">Avg Time</Typography>
                      </th>
                      <th className="text-center py-3 px-4">
                        <Typography variant="small" weight="semibold">Drop-off</Typography>
                      </th>
                      {lessonAnalytics.some(l => l.avgQuizScore !== undefined) && (
                        <th className="text-center py-3 px-4">
                          <Typography variant="small" weight="semibold">Quiz Score</Typography>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lessonAnalytics.map((lesson) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        onClick={onViewLesson ? () => onViewLesson(lesson.id) : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No lesson data"
                description="Lesson analytics will appear here once students start learning"
              />
            )}
          </Card>
        )}

        {/* Languages Tab */}
        {activeTab === 'languages' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Typography variant="h6" className="mb-4">Language Distribution</Typography>
              {languageUsage.length > 0 ? (
                <div className="space-y-4">
                  {languageUsage.map((lang) => (
                    <div key={lang.language}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon icon={Globe} size="sm" className="text-gray-400" />
                          <Typography variant="body" weight="medium">{lang.name}</Typography>
                        </div>
                        <Typography variant="small" color="secondary">
                          {formatNumber(lang.studentCount)} students ({lang.percentage}%)
                        </Typography>
                      </div>
                      <ProgressBar value={lang.percentage} color="primary" />
                    </div>
                  ))}
                </div>
              ) : (
                <Typography variant="small" color="secondary">
                  No language data available
                </Typography>
              )}
            </Card>
            
            <Card>
              <Typography variant="h6" className="mb-4">Language Insights</Typography>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Typography variant="small" weight="medium" className="text-blue-700 dark:text-blue-300">
                    Most Popular Language
                  </Typography>
                  <Typography variant="body">
                    {languageUsage.length > 0 
                      ? languageUsage.sort((a, b) => b.studentCount - a.studentCount)[0]?.name 
                      : 'N/A'}
                  </Typography>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Typography variant="small" weight="medium" className="text-green-700 dark:text-green-300">
                    Total Languages Used
                  </Typography>
                  <Typography variant="body">{languageUsage.length}</Typography>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Typography variant="small" weight="medium" className="text-purple-700 dark:text-purple-300">
                    Bilingual Learners
                  </Typography>
                  <Typography variant="small" color="secondary">
                    Students using translation features
                  </Typography>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayoutTemplate>
  );
};

CourseAnalyticsTemplate.displayName = 'CourseAnalyticsTemplate';
