// Organisms - Complex UI components composed of molecules and atoms
export * from './AchievementsCard';

// ContentSelector - for selecting modules/lessons for publishing
export * from './ContentSelector';
export * from './AssessmentCard';
export * from './DailyGoalsCard';
export * from './QuickStatsWidget';
export * from './RecommendationsCard';
export * from './EnhancedStatsCards';
export * from './ConceptCard';
export * from './ConceptDetailPanel';
export * from './FlashCard';
export * from './Form';
// GoalDisplay - explicit exports to avoid Milestone type conflict
export { GoalDisplay } from './GoalDisplay';
export type { GoalDisplayProps, Milestone } from './GoalDisplay';

// GoalReview - explicit exports to avoid Milestone type conflict
export { GoalReview } from './GoalReview';
export type { GoalReviewProps, LearningGoal, Milestone as GoalReviewMilestone } from './GoalReview';

export * from './PlacementTest';
export * from './Header';
export * from './LessonCard';
export * from './LessonPanel';
export * from './List';
export * from './Navigation';
export * from './OperationPanel';
export * from './QuestionCard';
export * from './Sidebar';
export * from './Table';

// ProgressTracker - explicit exports to avoid Lesson type conflict
export { ProgressTracker } from './ProgressTracker';
export type { ProgressTrackerProps, Lesson as ProgressTrackerLesson } from './ProgressTracker';

// Visualization components
export * from './ForceGraph';
export * from './TreeMap';

// LessonSegments - explicit exports
export * from './LessonSegments';

// LearningGoalDisplay - explicit exports
export * from './LearningGoalDisplay';

// QuestionWidget - explicit exports
export * from './QuestionWidget';

// NotesWidget - explicit exports
export * from './NotesWidget';

// PrerequisitesDisplay - explicit exports
export { PrerequisitesDisplay } from './PrerequisitesDisplay/PrerequisitesDisplay';
export type { PrerequisitesDisplayProps } from './PrerequisitesDisplay/PrerequisitesDisplay';

// PrerequisiteList - explicit exports
export { PrerequisiteList } from './PrerequisiteList/PrerequisiteList';
export type { PrerequisiteListProps } from './PrerequisiteList/PrerequisiteList';

// StreamingConceptsDisplay - explicit exports
export * from './StreamingConceptsDisplay';

// AnnotatedLessonContent - for lesson content with questions/notes highlighting
export * from './AnnotatedLessonContent';

// Publishing components
export * from './PublishingSidebar';
export * from './ContentReadinessCard';
export * from './TranslatedContentViewer';
export * from './BilingualViewer';
export * from './BulkActionBar';

// ScheduleCalendar - explicit exports to avoid ScheduleSlot conflict
export { ScheduleCalendar } from './ScheduleCalendar';
export type { ScheduleCalendarProps, CalendarView } from './ScheduleCalendar';
export type { ScheduleSlot as ScheduleCalendarSlot } from './ScheduleCalendar';

// ScheduleList - explicit exports to avoid ScheduleSlot and SortOption conflicts
export { ScheduleList } from './ScheduleList';
export type { ScheduleListProps, FilterBy } from './ScheduleList';
export type { ScheduleSlot as ScheduleListSlot, SortOption as ScheduleListSortOption } from './ScheduleList';
