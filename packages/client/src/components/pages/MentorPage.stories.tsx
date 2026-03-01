import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MentorPage } from './MentorPage';
import type { LearningPathSummary } from '../../features/knowledge-graph/api/types';
import type { MentorPublishedCourse } from '../../features/knowledge-graph/api/publishingApi';

const meta: Meta<typeof MentorPage> = {
  title: 'Pages/MentorPage',
  component: MentorPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onLearningPathClick: { action: 'learning path clicked' },
    onCreateNewPath: { action: 'create new path' },
    onDeleteCourse: { action: 'delete course' },
  },
};

export default meta;
type Story = StoryObj<typeof MentorPage>;

const mockLearningPaths: LearningPathSummary[] = [
  {
    id: 'graph-1',
    title: 'React Fundamentals',
    description: 'Learn React from scratch',
    conceptCount: 15,
    seedConcept: {
      id: 'react-1',
      name: 'React',
      description: 'A JavaScript library',
    },
  },
  {
    id: 'graph-2',
    title: 'TypeScript Basics',
    description: 'Master TypeScript',
    conceptCount: 10,
    seedConcept: {
      id: 'ts-1',
      name: 'TypeScript',
      description: 'Typed JavaScript',
    },
  },
];

const mockCourses: MentorPublishedCourse[] = [
  {
    graphId: 'graph-1',
    title: 'React Fundamentals Course',
    description: 'A comprehensive course on React',
    isPublished: true,
    publishedAt: Date.now(),
    visibility: 'public',
    enrollmentEnabled: true,
  },
];

export const Default: Story = {
  args: {
    learningPaths: mockLearningPaths,
    courses: mockCourses,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'mentor', label: 'Mentor', active: true },
    ],
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Empty: Story = {
  args: {
    learningPaths: [],
    courses: [],
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const WithError: Story = {
  args: {
    learningPaths: [],
    courses: [],
    error: 'Failed to load learning paths',
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
