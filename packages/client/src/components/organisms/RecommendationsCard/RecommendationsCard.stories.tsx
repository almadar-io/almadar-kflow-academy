import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { RecommendationsCard, type RecommendedCourse } from './RecommendationsCard';

const meta: Meta<typeof RecommendationsCard> = {
  title: 'Organisms/RecommendationsCard',
  component: RecommendationsCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RecommendationsCard>;

const mockContinueCourses: RecommendedCourse[] = [
  {
    id: '1',
    title: 'React Fundamentals',
    description: 'Continue learning React basics',
  },
  {
    id: '2',
    seedConceptName: 'JavaScript Advanced',
    description: 'Master advanced JavaScript concepts',
  },
];

const mockRecommendedCourses: RecommendedCourse[] = [
  {
    id: '3',
    title: 'TypeScript Basics',
    description: 'Learn TypeScript from scratch',
  },
  {
    id: '4',
    seedConceptName: 'Node.js Development',
    description: 'Build server-side applications with Node.js',
  },
  {
    id: '5',
    title: 'GraphQL API Design',
    description: 'Design and implement GraphQL APIs',
  },
];

export const Default: Story = {
  args: {
    continueCourses: mockContinueCourses,
    recommendedCourses: mockRecommendedCourses,
    isLoading: false,
    onCourseClick: (courseId: string) => {
      console.log('Course clicked:', courseId);
    },
  },
};

export const OnlyContinueLearning: Story = {
  args: {
    continueCourses: mockContinueCourses,
    recommendedCourses: [],
    isLoading: false,
  },
};

export const OnlyRecommended: Story = {
  args: {
    continueCourses: [],
    recommendedCourses: mockRecommendedCourses,
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const Error: Story = {
  args: {
    error: 'Failed to load recommendations. Please try again later.',
    isLoading: false,
  },
};

export const Empty: Story = {
  args: {
    continueCourses: [],
    recommendedCourses: [],
    isLoading: false,
  },
};

export const ManyCourses: Story = {
  args: {
    continueCourses: Array.from({ length: 5 }, (_, i) => ({
      id: `continue-${i}`,
      title: `Continue Course ${i + 1}`,
      description: `Description for continue course ${i + 1}`,
    })),
    recommendedCourses: Array.from({ length: 10 }, (_, i) => ({
      id: `recommended-${i}`,
      title: `Recommended Course ${i + 1}`,
      description: `Description for recommended course ${i + 1}`,
    })),
    isLoading: false,
  },
};
