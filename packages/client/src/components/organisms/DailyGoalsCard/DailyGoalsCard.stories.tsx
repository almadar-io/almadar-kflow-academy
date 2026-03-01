import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { DailyGoalsCard, type DailyActivity } from './DailyGoalsCard';

const meta: Meta<typeof DailyGoalsCard> = {
  title: 'Organisms/DailyGoalsCard',
  component: DailyGoalsCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DailyGoalsCard>;

const mockActivities: DailyActivity[] = [
  {
    type: 'lesson_completed',
    resourceId: '1',
    resourceName: 'Introduction to React',
    timestamp: Date.now() - 3600000,
  },
  {
    type: 'lesson_completed',
    resourceId: '2',
    resourceName: 'React Components',
    timestamp: Date.now() - 7200000,
  },
  {
    type: 'course_started',
    resourceId: '3',
    resourceName: 'Advanced JavaScript',
    timestamp: Date.now() - 10800000,
  },
];

export const Default: Story = {
  args: {
    goal: 3,
    dailyProgress: {
      completed: 2,
      progressPercentage: 67,
      activities: mockActivities,
    },
    isLoading: false,
  },
};

export const GoalAchieved: Story = {
  args: {
    goal: 3,
    dailyProgress: {
      completed: 3,
      progressPercentage: 100,
      activities: mockActivities,
    },
    isLoading: false,
  },
};

export const NoProgress: Story = {
  args: {
    goal: 3,
    dailyProgress: {
      completed: 0,
      progressPercentage: 0,
      activities: [],
    },
    isLoading: false,
  },
};

export const ManyActivities: Story = {
  args: {
    goal: 5,
    dailyProgress: {
      completed: 4,
      progressPercentage: 80,
      activities: Array.from({ length: 10 }, (_, i) => ({
        type: i % 2 === 0 ? 'lesson_completed' : 'course_started',
        resourceId: `${i}`,
        resourceName: `Activity ${i + 1}`,
        timestamp: Date.now() - i * 3600000,
      })),
    },
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
    error: 'Failed to load daily goals. Please try again later.',
    isLoading: false,
  },
};

export const WithUpdateGoal: Story = {
  args: {
    goal: 3,
    dailyProgress: {
      completed: 2,
      progressPercentage: 67,
      activities: mockActivities,
    },
    isLoading: false,
    onUpdateGoal: async (newGoal: number) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Goal updated to:', newGoal);
    },
  },
};

export const Editing: Story = {
  args: {
    goal: 3,
    dailyProgress: {
      completed: 2,
      progressPercentage: 67,
      activities: mockActivities,
    },
    isLoading: false,
    onUpdateGoal: async (newGoal: number) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Goal updated to:', newGoal);
    },
  },
  render: (args: any) => {
    // This would need state management in a real scenario
    return <DailyGoalsCard {...args} />;
  },
};
