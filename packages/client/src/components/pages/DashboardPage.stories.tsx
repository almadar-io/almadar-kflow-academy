import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { DashboardPage } from './DashboardPage';
import { JumpBackInItem } from '../../features/dashboard/preferencesApi';
import { RecentActivity } from '../../features/dashboard/statisticsApi';

const meta: Meta<typeof DashboardPage> = {
  title: 'Pages/DashboardPage',
  component: DashboardPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onJumpBackInClick: { action: 'jump back in clicked' },
    onCreateLearningPath: { action: 'create learning path' },
    onBrowseCourses: { action: 'browse courses' },
    onMentorStudio: { action: 'mentor studio' },
    onActivityClick: { action: 'activity clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof DashboardPage>;

const mockJumpBackInItems: JumpBackInItem[] = [
  {
    id: '1',
    type: 'learningPath',
    title: 'React Fundamentals',
    description: 'Learn the basics of React',
    lastAccessedAt: Date.now() - 3600000,
    metadata: {
      graphId: 'graph-1',
      seedConceptId: 'react-1',
      conceptCount: 15,
      levelCount: 3,
    },
  },
  {
    id: '2',
    type: 'course',
    title: 'Advanced JavaScript',
    description: 'Master advanced JavaScript concepts',
    lastAccessedAt: Date.now() - 7200000,
    progress: {
      completedLessons: 5,
      totalLessons: 10,
      progressPercentage: 50,
    },
    metadata: {
      courseId: 'course-1',
      enrollmentId: 'enrollment-1',
    },
  },
];

const mockActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'lesson_completed',
    resourceId: 'lesson-1',
    resourceName: 'Introduction to React',
    timestamp: Date.now() - 1800000,
    metadata: {
      courseId: 'course-1',
      lessonId: 'lesson-1',
    },
  },
  {
    id: '2',
    type: 'concept_studied',
    resourceId: 'concept-1',
    resourceName: 'React Components',
    timestamp: Date.now() - 3600000,
    metadata: {
      graphId: 'graph-1',
      conceptId: 'concept-1',
    },
  },
];

export const Default: Story = {
  args: {
    userName: 'John Doe',
    jumpBackInItems: mockJumpBackInItems,
    activities: mockActivities,
    hasLearningPaths: true,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home', active: true },
      { id: 'learn', label: 'Learn' },
      { id: 'courses', label: 'Courses' },
    ],
  },
};

export const NoLearningPaths: Story = {
  args: {
    userName: 'Jane Smith',
    jumpBackInItems: [],
    activities: [],
    hasLearningPaths: false,
    user: {
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home', active: true },
      { id: 'learn', label: 'Learn' },
    ],
  },
};

export const Loading: Story = {
  args: {
    userName: 'User',
    isLoadingJumpBackIn: true,
    isLoadingActivity: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Empty: Story = {
  args: {
    userName: 'New User',
    jumpBackInItems: [],
    activities: [],
    hasLearningPaths: false,
    user: {
      name: 'New User',
    },
    navigationItems: [],
  },
};
