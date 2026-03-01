import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CourseDetailPage } from './CourseDetailPage';
import type { Module } from '../organisms/CourseSidebar';

const meta: Meta<typeof CourseDetailPage> = {
  title: 'Pages/CourseDetailPage',
  component: CourseDetailPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onLessonClick: { action: 'lesson clicked' },
    onEnroll: { action: 'enroll clicked' },
    onContinue: { action: 'continue clicked' },
    onBack: { action: 'back clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof CourseDetailPage>;

const mockModules: Module[] = [
  {
    id: '1',
    title: 'Introduction',
    lessons: [
      {
        id: '1-1',
        title: 'Welcome to the Course',
        status: 'completed',
        duration: 10,
      },
      {
        id: '1-2',
        title: 'Course Overview',
        status: 'current',
        duration: 15,
      },
      {
        id: '1-3',
        title: 'Getting Started',
        status: 'upcoming',
        duration: 20,
      },
    ],
  },
  {
    id: '2',
    title: 'Core Concepts',
    lessons: [
      {
        id: '2-1',
        title: 'Fundamentals',
        status: 'locked',
        duration: 25,
      },
    ],
  },
];

export const Default: Story = {
  args: {
    courseId: '1',
    course: {
      id: '1',
      title: 'React Fundamentals',
      description: 'Learn the basics of React and build modern web applications.',
      duration: '8 hours',
      studentCount: 1250,
      rating: 4.8,
      isPublic: true,
    },
    progress: {
      value: 45,
      totalLessons: 10,
      completedLessons: 4,
      currentLessonId: '1-2',
    },
    modules: mockModules,
    isEnrolled: true,
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

export const NotEnrolled: Story = {
  args: {
    courseId: '1',
    course: {
      id: '1',
      title: 'React Fundamentals',
      description: 'Learn the basics of React and build modern web applications.',
      duration: '8 hours',
      studentCount: 1250,
      rating: 4.8,
      isPublic: true,
    },
    modules: mockModules,
    isEnrolled: false,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Loading: Story = {
  args: {
    courseId: '1',
    loading: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Error: Story = {
  args: {
    courseId: '1',
    error: 'Course not found',
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Completed: Story = {
  args: {
    courseId: '1',
    course: {
      id: '1',
      title: 'React Fundamentals',
      description: 'Learn the basics of React and build modern web applications.',
      duration: '8 hours',
      studentCount: 1250,
      rating: 4.8,
      isPublic: true,
    },
    progress: {
      value: 100,
      totalLessons: 10,
      completedLessons: 10,
    },
    modules: mockModules,
    isEnrolled: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
