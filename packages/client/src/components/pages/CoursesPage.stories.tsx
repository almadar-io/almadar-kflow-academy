import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CoursesPage } from './CoursesPage';
import type { CourseCardProps } from '../organisms/CourseCard';

const meta: Meta<typeof CoursesPage> = {
  title: 'Pages/CoursesPage',
  component: CoursesPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onCourseClick: { action: 'course clicked' },
    onEnrollClick: { action: 'enroll clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof CoursesPage>;

const mockEnrolledCourses: CourseCardProps[] = [
  {
    id: '1',
    title: 'React Fundamentals',
    description: 'Learn the basics of React',
    progress: 45,
    modules: 3,
    duration: 8,
    isPublic: true,
  },
  {
    id: '2',
    title: 'Advanced JavaScript',
    description: 'Master advanced JavaScript concepts',
    progress: 80,
    modules: 5,
    duration: 12,
    isPublic: true,
  },
];

const mockAvailableCourses: CourseCardProps[] = [
  {
    id: '3',
    title: 'TypeScript Basics',
    description: 'Introduction to TypeScript',
    modules: 4,
    duration: 10,
    isPublic: true,
  },
  {
    id: '4',
    title: 'Node.js Essentials',
    description: 'Learn Node.js fundamentals',
    modules: 6,
    duration: 15,
    isPublic: true,
  },
];

export const Default: Story = {
  args: {
    enrolledCourses: mockEnrolledCourses,
    availableCourses: mockAvailableCourses,
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
    isLoadingEnrolled: true,
    isLoadingAvailable: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Empty: Story = {
  args: {
    enrolledCourses: [],
    availableCourses: [],
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const OnlyEnrolled: Story = {
  args: {
    enrolledCourses: mockEnrolledCourses,
    availableCourses: [],
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const OnlyAvailable: Story = {
  args: {
    enrolledCourses: [],
    availableCourses: mockAvailableCourses,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
