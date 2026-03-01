import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CourseDetailTemplate } from './CourseDetailTemplate';

const meta: Meta<typeof CourseDetailTemplate> = {
  title: 'Templates/CourseDetailTemplate',
  component: CourseDetailTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CourseDetailTemplate>;

const mockModules = [
  {
    id: 'm1',
    title: 'Getting Started',
    lessons: [
      { id: 'l1', title: 'Introduction to React', status: 'completed' as const, duration: 15 },
      { id: 'l2', title: 'Setting Up Your Environment', status: 'completed' as const, duration: 20 },
      { id: 'l3', title: 'Your First Component', status: 'current' as const, duration: 25 },
    ],
    expanded: true,
  },
  {
    id: 'm2',
    title: 'Core Concepts',
    lessons: [
      { id: 'l4', title: 'Understanding JSX', status: 'upcoming' as const, duration: 20 },
      { id: 'l5', title: 'Props and State', status: 'upcoming' as const, duration: 30 },
      { id: 'l6', title: 'Event Handling', status: 'upcoming' as const, duration: 25 },
    ],
  },
  {
    id: 'm3',
    title: 'Advanced Topics',
    lessons: [
      { id: 'l7', title: 'Hooks Deep Dive', status: 'locked' as const, duration: 45 },
      { id: 'l8', title: 'Context API', status: 'locked' as const, duration: 30 },
      { id: 'l9', title: 'Performance Optimization', status: 'locked' as const, duration: 35 },
    ],
  },
];

const mockBreadcrumbs = [
  { label: 'Courses', href: '/courses' },
  { label: 'Web Development', href: '/courses/web-dev' },
  { label: 'React Fundamentals' },
];

export const InProgress: Story = {
  args: {
    id: '1',
    title: 'React Fundamentals',
    description: 'Master the fundamentals of React, including components, props, state, and hooks. Build real-world applications with modern React patterns and best practices.',
    progress: 35,
    totalLessons: 9,
    completedLessons: 3,
    duration: '4 hours',
    studentCount: 1234,
    rating: 4.8,
    status: 'in-progress',
    modules: mockModules,
    currentLessonId: 'l3',
    instructor: {
      id: 'i1',
      name: 'Jane Smith',
      title: 'Senior React Developer',
      avatar: 'https://i.pravatar.cc/150?u=jane',
    },
    breadcrumbs: mockBreadcrumbs,
    isEnrolled: true,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
    onLessonClick: (lessonId: string) => console.log('Lesson clicked:', lessonId),
    onContinueClick: () => console.log('Continue clicked'),
  },
};

export const NotStarted: Story = {
  args: {
    ...InProgress.args,
    progress: 0,
    completedLessons: 0,
    status: 'not-started',
    currentLessonId: 'l1',
    modules: mockModules.map(m => ({
      ...m,
      lessons: m.lessons.map((l, i) => ({
        ...l,
        status: i === 0 && m.id === 'm1' ? 'current' as const : 'locked' as const,
      })),
    })),
  },
};

export const Completed: Story = {
  args: {
    ...InProgress.args,
    progress: 100,
    completedLessons: 9,
    status: 'completed',
    modules: mockModules.map(m => ({
      ...m,
      lessons: m.lessons.map(l => ({
        ...l,
        status: 'completed' as const,
      })),
    })),
  },
};

export const NotEnrolled: Story = {
  args: {
    ...InProgress.args,
    progress: 0,
    completedLessons: 0,
    isEnrolled: false,
    status: 'not-started',
    onEnrollClick: () => alert('Enroll clicked'),
  },
};

export const Mobile: Story = {
  args: {
    ...InProgress.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const Tablet: Story = {
  args: {
    ...InProgress.args,
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

