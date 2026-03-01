import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ProgressCard } from './ProgressCard';
import { BookOpen, Target, TrendingUp } from 'lucide-react';

const meta: Meta<typeof ProgressCard> = {
  title: 'Molecules/ProgressCard',
  component: ProgressCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProgressCard>;

export const Default: Story = {
  args: {
    title: 'Course Progress',
    progress: 65,
    icon: BookOpen,
    statistics: [
      { label: 'Completed', value: '13/20' },
      { label: 'Remaining', value: '7 lessons' },
    ],
  },
};

export const WithoutIcon: Story = {
  args: {
    title: 'Learning Progress',
    progress: 45,
    statistics: [
      { label: 'Lessons', value: '9' },
      { label: 'Time', value: '2.5h' },
    ],
  },
};

export const WithoutStatistics: Story = {
  args: {
    title: 'Simple Progress',
    progress: 80,
    icon: Target,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <ProgressCard
        title="Default Progress"
        progress={50}
        icon={BookOpen}
        progressVariant="primary"
      />
      <ProgressCard
        title="Success Progress"
        progress={75}
        icon={TrendingUp}
        progressVariant="success"
        statistics={[{ label: 'Score', value: '95%' }]}
      />
      <ProgressCard
        title="Warning Progress"
        progress={40}
        icon={Target}
        progressVariant="warning"
      />
      <ProgressCard
        title="Danger Progress"
        progress={20}
        icon={BookOpen}
        progressVariant="danger"
      />
    </div>
  ),
};

export const Complete: Story = {
  args: {
    title: 'Complete Course Progress',
    progress: 85,
    icon: BookOpen,
    progressVariant: 'success',
    statistics: [
      { label: 'Completed', value: '17/20' },
      { label: 'Time Spent', value: '12.5h' },
      { label: 'Average Score', value: '92%' },
    ],
  },
};
