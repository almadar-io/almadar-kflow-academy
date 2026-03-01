/**
 * MentorPage Library Component
 * 
 * Mentor page component using DashboardTemplate.
 * Receives data as props - containers handle data fetching and state management.
 */

import React from 'react';
import { DashboardTemplate } from '../templates/DashboardTemplate';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { Alert } from '../molecules/Alert';
import { Menu } from '../molecules/Menu';
import { StatCard } from '../molecules/StatCard';
import { ConceptCard } from '../../features/concepts/components';
import { 
  Lightbulb, 
  Plus, 
  Globe, 
  Lock, 
  BookOpen, 
  Trash2, 
  MoreVertical, 
  Settings, 
  Copy, 
  Check,
  Users,
  TrendingUp,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import type { Concept } from '../../features/concepts/types';
import type { LearningPathSummary } from '../../features/knowledge-graph/api/types';
import type { MentorPublishedCourse } from '../../features/knowledge-graph/hooks';
import type { LucideIcon } from 'lucide-react';

// Re-export for backwards compatibility
export type { MentorPublishedCourse as PublishedCourse };

export interface MentorDashboardStats {
  /**
   * Total published courses count
   */
  totalCourses: number;
  
  /**
   * Total enrolled students across all courses
   */
  totalStudents: number;
  
  /**
   * Average completion rate across courses (0-100)
   */
  avgCompletionRate: number;
  
  /**
   * Total revenue (optional)
   */
  totalRevenue?: number;
}

export interface MentorPageProps {
  /**
   * Learning paths
   */
  learningPaths?: LearningPathSummary[];
  
  /**
   * Published courses (from graph-based publishing)
   */
  courses?: MentorPublishedCourse[];
  
  /**
   * Dashboard stats
   */
  stats?: MentorDashboardStats;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Copied link course ID
   */
  copiedLink?: string | null;
  
  /**
   * Course to delete
   */
  courseToDelete?: string | null;
  
  /**
   * Course to update
   */
  courseToUpdate?: string | null;
  
  /**
   * Is deleting course
   */
  isDeleting?: boolean;
  
  /**
   * Show goal form
   */
  showGoalForm?: boolean;
  
  /**
   * Publishing dialog states
   */
  showLearningPathsDialog?: boolean;
  showPublishCourseDialog?: boolean;
  showModulesDialog?: boolean;
  showLessonsDialog?: boolean;
  currentLearningPath?: { graphId: string; seedConcept: Concept } | null;
  publishedCourseId?: string | null;
  selectedModuleId?: string | null;
  
  /**
   * Callbacks
   */
  onRefreshCourses?: () => void;
  onGoalFormComplete?: (result: { goalId: string; graphId: string }) => void;
  onCreateNewPath?: () => void;
  onLearningPathClick?: (graphId: string) => void;
  onDeleteCourse?: () => void;
  onDeleteLearningPath?: (graphId: string) => Promise<void>;
  onNavigateToMentor?: (graphId: string) => void;
  onPublishLearningPath?: (graphId: string) => void;
  setCourseToDelete?: (id: string | null) => void;
  setCourseToUpdate?: (id: string | null) => void;
  setCopiedLink?: (id: string | null) => void;
  setShowGoalForm?: (show: boolean) => void;
  setShowLearningPathsDialog?: (show: boolean) => void;
  setShowPublishCourseDialog?: (show: boolean) => void;
  setShowModulesDialog?: (show: boolean) => void;
  setShowLessonsDialog?: (show: boolean) => void;
  handleLearningPathsSelected?: (graphIds: string[]) => void;
  handleCoursePublished?: (courseId: string) => void;
  handleModulesPublished?: (moduleIds: string[]) => void;
  handleLessonsPublished?: () => void;
  handlePublishCourseDialogClose?: () => void;
  handleModulesDialogClose?: () => void;
  handleLessonsDialogClose?: () => void;
  
  /**
   * Seed entries (for dialogs - legacy support)
   */
  seedEntries?: Array<{ graph: any; seedConcept: Concept; conceptCount: number; levelCount: number }>;
  
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
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Dialogs (feature components - passed as React nodes)
   */
  goalFormDialog?: React.ReactNode;
  selectLearningPathsDialog?: React.ReactNode;
  publishCourseDialog?: React.ReactNode;
  manageCourseDialog?: React.ReactNode;
  selectModulesDialog?: React.ReactNode;
  selectLessonsDialog?: React.ReactNode;
  confirmationDialog?: React.ReactNode;
}

export const MentorPage: React.FC<MentorPageProps> = ({
  learningPaths = [],
  courses = [],
  stats,
  loading = false,
  error = null,
  copiedLink,
  courseToDelete,
  courseToUpdate,
  isDeleting = false,
  showGoalForm = false,
  showLearningPathsDialog = false,
  showPublishCourseDialog = false,
  showModulesDialog = false,
  showLessonsDialog = false,
  currentLearningPath,
  publishedCourseId,
  selectedModuleId,
  onRefreshCourses,
  onGoalFormComplete,
  onCreateNewPath,
  onLearningPathClick,
  onDeleteCourse,
  onDeleteLearningPath,
  onNavigateToMentor,
  onPublishLearningPath,
  setCourseToDelete,
  setCourseToUpdate,
  setCopiedLink,
  setShowGoalForm,
  setShowLearningPathsDialog,
  setShowPublishCourseDialog,
  setShowModulesDialog,
  setShowLessonsDialog,
  handleLearningPathsSelected,
  handleCoursePublished,
  handleModulesPublished,
  handleLessonsPublished,
  handlePublishCourseDialogClose,
  handleModulesDialogClose,
  handleLessonsDialogClose,
  seedEntries = [],
  user,
  navigationItems,
  logo,
  onLogoClick,
  onLogout,
  goalFormDialog,
  selectLearningPathsDialog,
  publishCourseDialog,
  manageCourseDialog,
  selectModulesDialog,
  selectLessonsDialog,
  confirmationDialog,
}) => {
  // Convert LearningPathSummary to Concept for ConceptCard
  // Use seedConcept.name as the display name (not goal title)
  const convertToConcept = (path: LearningPathSummary): Concept => {
    return {
      id: path.seedConcept?.id || path.id,
      name: path.seedConcept?.name || path.title, // Prefer seed concept name over goal title
      description: path.seedConcept?.description || path.description,
      isSeed: true,
      parents: [],
      children: [],
      layer: 0,
      prerequisites: [],
    };
  };

  return (
    <DashboardTemplate
      variant="mentor"
      user={user}
      navigationItems={navigationItems}
      logo={logo}
      onLogoClick={onLogoClick}
      onLogout={onLogout}
    >
      {loading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <Typography variant="body" className="mt-4" color="secondary">
              Loading mentor paths...
            </Typography>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          Failed to load learning paths: {error}
        </Alert>
      )}

      {/* Welcome Section */}
      <div className="mb-8">
        <Typography variant="h1" className="mb-2">
          Mentoring Studio
        </Typography>
        <Typography variant="body" color="secondary">
          Create and manage your courses. Turn your learning paths into structured lessons for others.
        </Typography>
      </div>

      {/* Stats Banner */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Published Courses"
            value={stats.totalCourses}
            icon={BookOpen}
          />
          <StatCard
            label="Total Students"
            value={stats.totalStudents}
            icon={Users}
          />
          <StatCard
            label="Avg. Completion Rate"
            value={`${stats.avgCompletionRate.toFixed(0)}%`}
            icon={TrendingUp}
          />
          <StatCard
            label="Active Courses"
            value={courses.filter(c => c.isPublished).length}
            icon={GraduationCap}
          />
        </div>
      )}

      {/* Published Courses Section */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
          <Button
            variant="primary"
            onClick={() => setShowLearningPathsDialog?.(true)}
            icon={Plus}
            className="sm:order-2"
          >
            Publish a Course
          </Button>
          <div className="flex items-center gap-3 sm:order-1">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <BookOpen size={20} />
            </div>
            <Typography variant="h3">Published Courses</Typography>
            {courses.length > 0 && (
              <Badge>{courses.length}</Badge>
            )}
          </div>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              // Determine visibility - graph-based courses use 'visibility' field
              const isPublic = course.visibility === 'public';
              // Use graphId as the unique identifier for graph-based courses
              const courseKey = course.graphId;
              
              return (
                <Card key={courseKey} className="relative group !overflow-visible">
                  <div 
                    className="absolute top-3 right-3 isolate z-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Menu
                      trigger={
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={18} />
                        </Button>
                      }
                      items={[
                        {
                          id: 'update',
                          label: 'Update Course',
                          onClick: () => setCourseToUpdate?.(courseKey),
                          icon: Settings,
                        },
                        {
                          id: 'delete',
                          label: 'Delete',
                          onClick: () => setCourseToDelete?.(courseKey),
                          icon: Trash2,
                        },
                      ]}
                      position="bottom-right"
                    />
                  </div>

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <Globe className="text-green-600 dark:text-green-400" size={16} />
                      ) : course.visibility === 'unlisted' ? (
                        <Copy className="text-yellow-500 dark:text-yellow-400" size={16} />
                      ) : (
                        <Lock className="text-gray-400 dark:text-gray-500" size={16} />
                      )}
                      <Badge variant="default" size="sm">
                        {course.visibility === 'public' ? 'Public' : course.visibility === 'unlisted' ? 'Unlisted' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                  <div onClick={() => setCourseToUpdate?.(courseKey)} className="cursor-pointer">
                    <Typography variant="h4" className="mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {course.title}
                    </Typography>
                    <Typography variant="body" color="secondary" className="mb-4 line-clamp-2">
                      {course.description}
                    </Typography>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <Badge variant="default" size="sm">
                        {course.totalModules} modules
                      </Badge>
                      <Badge variant="default" size="sm">
                        {course.totalLessons} lessons
                      </Badge>
                      {course.enrollmentCount !== undefined && course.enrollmentCount > 0 && (
                        <Badge variant="default" size="sm">
                          {course.enrollmentCount} students
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <BookOpen size={32} />
            </div>
            <Typography variant="h4" className="mb-2">No published courses</Typography>
            <Typography variant="body" color="secondary" className="mb-6 max-w-sm mx-auto">
              Select a learning path below to start creating your first course.
            </Typography>
          </Card>
        )}
      </div>

      {/* Learning Paths Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
          <Button
            variant="primary"
            onClick={onCreateNewPath}
            icon={Plus}
            className="sm:order-2"
          >
            Create New Path
          </Button>
          <div className="flex items-center gap-3 sm:order-1">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Lightbulb size={20} />
            </div>
            <Typography variant="h3">Available Learning Paths</Typography>
            {learningPaths.length > 0 && (
              <Badge>{learningPaths.length}</Badge>
            )}
          </div>
        </div>

        {learningPaths.length === 0 && !loading ? (
          <Card className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Lightbulb size={32} />
            </div>
            <Typography variant="h4" className="mb-2">No learning paths available</Typography>
            <Typography variant="body" color="secondary" className="mb-6 max-w-sm mx-auto">
              Create a learning path to use as a base for your course.
            </Typography>
            <Button variant="primary" onClick={onCreateNewPath} icon={Plus}>
              Create Path
            </Button>
          </Card>
        ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {learningPaths.map((path) => (
                      <ConceptCard
                        key={path.id}
                        concept={convertToConcept(path)}
                        onClick={() => onLearningPathClick?.(path.id)}
                        conceptCount={path.conceptCount}
                        graphId={path.id}
                        showMentorIcon={true}
                        onDelete={onDeleteLearningPath}
                        onPublishCourse={onPublishLearningPath}
                      />
                    ))}
                  </div>
        )}
      </div>

      {/* Dialogs */}
      {goalFormDialog}
      {selectLearningPathsDialog}
      {publishCourseDialog}
      {manageCourseDialog}
      {selectModulesDialog}
      {selectLessonsDialog}
      {confirmationDialog}
    </DashboardTemplate>
  );
};

MentorPage.displayName = 'MentorPage';
