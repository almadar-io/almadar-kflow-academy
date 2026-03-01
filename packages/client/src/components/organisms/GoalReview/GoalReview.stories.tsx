import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { GoalReview, type LearningGoal } from './GoalReview';

const meta: Meta<typeof GoalReview> = {
  title: 'Organisms/GoalReview',
  component: GoalReview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof GoalReview>;

const mockGoal: LearningGoal = {
  id: '1',
  title: 'Learn React and TypeScript',
  description: 'Master React fundamentals and TypeScript to build modern web applications',
  target: 'Build a full-stack application using React and TypeScript',
  type: 'project_based',
  estimatedTime: 40,
  milestones: [
    {
      id: '1',
      title: 'Complete React basics',
      description: 'Learn components, props, and state',
    },
    {
      id: '2',
      title: 'Learn TypeScript',
      description: 'Understand types, interfaces, and generics',
    },
    {
      id: '3',
      title: 'Build project',
      description: 'Create a full-stack application',
    },
  ],
};

export const Default: Story = {
  args: {
    goal: mockGoal,
    onConfirm: () => {
      console.log('Goal confirmed');
    },
    onCancel: () => {
      console.log('Goal review cancelled');
    },
  },
};

export const WithUpdateGoal: Story = {
  args: {
    goal: mockGoal,
    onConfirm: () => {
      console.log('Goal confirmed');
    },
    onUpdateGoal: async (goalId: string, updates: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Goal updated:', goalId, updates);
    },
  },
};

export const Saving: Story = {
  args: {
    goal: mockGoal,
    onConfirm: () => {
      console.log('Goal confirmed');
    },
    onUpdateGoal: async (goalId: string, updates: any) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Goal updated:', goalId, updates);
    },
    isSaving: true,
  },
};

export const TopicBased: Story = {
  args: {
    goal: {
      ...mockGoal,
      type: 'topic_based',
      target: 'Understand machine learning fundamentals',
    },
    onConfirm: () => {
      console.log('Goal confirmed');
    },
  },
};

export const NoMilestones: Story = {
  args: {
    goal: {
      ...mockGoal,
      milestones: undefined,
    },
    onConfirm: () => {
      console.log('Goal confirmed');
    },
  },
};

export const NoEstimatedTime: Story = {
  args: {
    goal: {
      ...mockGoal,
      estimatedTime: undefined,
    },
    onConfirm: () => {
      console.log('Goal confirmed');
    },
  },
};
