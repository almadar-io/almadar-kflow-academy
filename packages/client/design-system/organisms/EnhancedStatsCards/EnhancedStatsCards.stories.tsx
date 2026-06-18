import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { EnhancedStatsCards } from './EnhancedStatsCards';

const meta: Meta<typeof EnhancedStatsCards> = {
  title: 'Organisms/EnhancedStatsCards',
  component: EnhancedStatsCards,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EnhancedStatsCards>;

const mockMainStats = {
  learningStreak: 7,
  conceptsMastered: 18,
  activeCourses: 3,
};

const mockDetailedStats = {
  totalStudyTime: 1200,
  lessonsCompleted: 42,
  coursesCompleted: 5,
  conceptsMastered: 18,
  learningStreak: 7,
  activeCourses: 3,
};

export const Default: Story = {
  args: {
    mainStats: mockMainStats,
    isLoading: false,
  },
};

export const WithDetailedStats: Story = {
  args: {
    mainStats: mockMainStats,
    detailedStats: mockDetailedStats,
    isLoading: false,
  },
};

export const WithLoadFunction: Story = {
  args: {
    mainStats: mockMainStats,
    isLoading: false,
    onLoadDetailedStats: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockDetailedStats;
    },
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const LoadingDetails: Story = {
  args: {
    mainStats: mockMainStats,
    isLoading: false,
    isLoadingDetails: true,
  },
};

export const Error: Story = {
  args: {
    error: 'Failed to load statistics. Please try again later.',
    isLoading: false,
  },
};

export const ZeroStats: Story = {
  args: {
    mainStats: {
      learningStreak: 0,
      conceptsMastered: 0,
      activeCourses: 0,
    },
    isLoading: false,
  },
};
