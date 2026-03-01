// Templates - Page-level layouts combining organisms, molecules, and atoms

export * from './AppLayoutTemplate';
export * from './DashboardTemplate';
export * from './CourseListTemplate';
export * from './CourseDetailTemplate';
export * from './LessonViewTemplate';
export * from './KnowledgeGraphTemplate';
export * from './ConceptDetailTemplate';
export * from './AssessmentTemplate';
export * from './ProfileTemplate';
export * from './AuthTemplate';
export * from './OnboardingTemplate';
export * from './SearchResultsTemplate';
export * from './ErrorTemplate';
export * from './LessonEditorTemplate';
export * from './FlashcardStudyTemplate';
export * from './AnalyticsTemplate';
export * from './NotificationCenterTemplate';

// Phase 3.4 - New Templates for Mentorship & Courses
export * from './MentorDashboardTemplate';
export * from './CourseAnalyticsTemplate';

// StudentCourseTemplate and EnrollmentTemplate both export CourseInstructor
// Re-export explicitly to avoid ambiguity
export {
  StudentCourseTemplate,
  type StudentCourseTemplateProps,
  type CourseModule as StudentCourseModule,
  type CourseLesson as StudentCourseLesson,
  // Note: CourseInstructor from StudentCourseTemplate is not re-exported to avoid conflict
} from './StudentCourseTemplate';

export {
  EnrollmentTemplate,
  type EnrollmentTemplateProps,
  type EnrollmentModule,
  type EnrollmentLesson,
  type CourseInstructor, // Primary export of CourseInstructor
} from './EnrollmentTemplate';

// Student Management Templates
export * from './StudentManagementDialog';
export * from './MentorCourseManagementTemplate';

