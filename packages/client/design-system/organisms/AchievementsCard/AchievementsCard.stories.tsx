import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { AchievementsCard, type Achievement } from './AchievementsCard';

const meta: Meta<typeof AchievementsCard> = {
  title: 'Organisms/AchievementsCard',
  component: AchievementsCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AchievementsCard>;

const mockAchievements: Achievement[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎯',
    unlockedAt: Date.now() - 86400000,
  },
  {
    id: '2',
    name: 'Quick Learner',
    description: 'Complete 5 lessons in a week',
    icon: '⚡',
    unlockedAt: Date.now() - 43200000,
  },
  {
    id: '3',
    name: 'Knowledge Seeker',
    description: 'Complete 10 lessons',
    icon: '📚',
    unlockedAt: Date.now() - 21600000,
  },
  {
    id: '4',
    name: 'Master',
    description: 'Complete 50 lessons',
    icon: '👑',
    unlockedAt: 0,
    progress: 65,
  },
  {
    id: '5',
    name: 'Perfect Week',
    description: 'Complete lessons 7 days in a row',
    icon: '🔥',
    unlockedAt: 0,
    progress: 42,
  },
  {
    id: '6',
    name: 'Course Conqueror',
    description: 'Complete your first course',
    icon: '🏆',
    unlockedAt: 0,
    progress: 0,
  },
];

export const Default: Story = {
  args: {
    achievements: mockAchievements,
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
    error: 'Failed to load achievements. Please try again later.',
    isLoading: false,
  },
};

export const Empty: Story = {
  args: {
    achievements: [],
    isLoading: false,
  },
};

export const OnlyUnlocked: Story = {
  args: {
    achievements: mockAchievements.filter(a => a.unlockedAt > 0),
    isLoading: false,
  },
};

export const OnlyLocked: Story = {
  args: {
    achievements: mockAchievements.filter(a => a.unlockedAt === 0),
    isLoading: false,
  },
};

export const ManyAchievements: Story = {
  args: {
    achievements: Array.from({ length: 20 }, (_, i) => ({
      id: `achievement-${i}`,
      name: `Achievement ${i + 1}`,
      description: `Description for achievement ${i + 1}`,
      icon: i % 2 === 0 ? '🎯' : '🏆',
      unlockedAt: i < 10 ? Date.now() - i * 1000000 : 0,
      progress: i >= 10 ? (i - 10) * 10 : undefined,
    })),
    isLoading: false,
  },
};

export const WithLoadFunction: Story = {
  args: {
    onLoadAchievements: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockAchievements;
    },
    isLoading: false,
  },
};
