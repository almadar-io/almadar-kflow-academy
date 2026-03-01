import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentCoursePage } from './StudentCoursePage';
import type { PublishedCourse, PublishedModule } from '../../../server/src/types/publishing';
import type { LessonPreview } from '../../features/student/types';

const meta: Meta<typeof StudentCoursePage> = {
  title: 'Pages/StudentCoursePage',
  component: StudentCoursePage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onEnroll: { action: 'enroll clicked' },
    onLessonSelect: { action: 'lesson selected' },
    onToggleSidebar: { action: 'sidebar toggled' },
  },
};

export default meta;
type Story = StoryObj<typeof StudentCoursePage>;

const mockCourse: PublishedCourse = {
  id: 'course-1',
  graphId: 'graph-1',
  seedConceptId: 'concept-1',
  seedConceptName: 'React',
  mentorId: 'mentor-1',
  mentorName: 'John Doe',
  title: 'React Fundamentals',
  description: 'Learn React from scratch',
  moduleIds: ['module-1', 'module-2'],
  moduleSequence: ['module-1', 'module-2'],
  isPublic: true,
  publishedAt: Date.now(),
  createdAt: Date.now(),
  version: 1,
  allowSkipAhead: false,
  requireSequentialProgress: true,
  propagateSettingsToModules: true,
  propagateSettingsToLessons: true,
  notificationInterval: 7,
  notificationType: 'email',
  status: 'published',
};

const mockModules: PublishedModule[] = [
  {
    id: 'module-1',
    courseId: 'course-1',
    title: 'Introduction',
    lessonIds: ['lesson-1', 'lesson-2'],
    sequence: ['lesson-1', 'lesson-2'],
    createdAt: Date.now(),
  },
];

const mockLessons: LessonPreview[] = [
  {
    id: 'lesson-1',
    title: 'Welcome to React',
    description: 'Introduction to React',
    moduleId: 'module-1',
    moduleTitle: 'Introduction',
    duration: 10,
    lessonContent: '<p>Welcome to React...</p>',
    flashCards: [],
  },
];

export const NotEnrolled: Story = {
  args: {
    courseId: 'course-1',
    course: mockCourse,
    modules: mockModules,
    lessons: mockLessons,
    isEnrolled: false,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'courses', label: 'Courses', active: true },
    ],
  },
};

export const Enrolled: Story = {
  args: {
    courseId: 'course-1',
    course: mockCourse,
    modules: mockModules,
    lessons: mockLessons,
    isEnrolled: true,
    enrollmentId: 'enrollment-1',
    selectedLessonId: 'lesson-1',
    isSidebarOpen: true,
    progress: {
      progressPercentage: 25,
      enrollment: {
        completedLessonIds: [],
        accessibleLessonIds: ['lesson-1'],
      },
    },
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'courses', label: 'Courses', active: true },
    ],
  },
};

export const Loading: Story = {
  args: {
    courseId: 'course-1',
    isCourseLoading: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Error: Story = {
  args: {
    courseId: 'course-1',
    course: null,
    courseError: 'Course not found',
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
