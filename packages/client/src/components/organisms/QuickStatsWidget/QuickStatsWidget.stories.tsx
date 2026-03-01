import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { QuickStatsWidget } from './QuickStatsWidget';

const meta: Meta<typeof QuickStatsWidget> = {
  title: 'Organisms/QuickStatsWidget',
  component: QuickStatsWidget,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QuickStatsWidget>;

const mockStats = {
  lessonsCompleted: 42,
  coursesCompleted: 5,
  conceptsMastered: 18,
  learningStreak: 7,
  activeCourses: 3,
};

export const Default: Story = {
  args: {
    stats: mockStats,
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const WithLoadFunction: Story = {
  args: {
    onLoadStats: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockStats;
    },
    isLoading: false,
  },
};

export const Expanded: Story = {
  args: {
    stats: mockStats,
    isLoading: false,
  },
  render: (args: any) => {
    // In a real scenario, this would be controlled by state
    return <QuickStatsWidget {...args} />;
  },
};

export const ZeroStats: Story = {
  args: {
    stats: {
      lessonsCompleted: 0,
      coursesCompleted: 0,
      conceptsMastered: 0,
      learningStreak: 0,
      activeCourses: 0,
    },
    isLoading: false,
  },
};
