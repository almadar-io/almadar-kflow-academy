import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { LearningGoalDisplay } from './LearningGoalDisplay';

const meta: Meta<typeof LearningGoalDisplay> = {
  title: 'Organisms/LearningGoalDisplay',
  component: LearningGoalDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onGoalUpdated: { action: 'goal updated' },
    onSave: { action: 'saved' },
  },
};

export default meta;
type Story = StoryObj<typeof LearningGoalDisplay>;

export const Default: Story = {
  args: {
    goal: 'Master the fundamentals of React components, including functional components, props, and state management.',
    layerNumber: 1,
    graphId: 'graph-1',
  },
};

export const WithoutGoal: Story = {
  args: {
    layerNumber: 2,
    graphId: 'graph-1',
  },
};

export const Editing: Story = {
  args: {
    goal: 'Learn advanced React patterns including hooks, context, and performance optimization.',
    layerNumber: 3,
    graphId: 'graph-1',
  },
};

export const Saving: Story = {
  args: {
    goal: 'Understand React component lifecycle and optimization techniques.',
    layerNumber: 4,
    graphId: 'graph-1',
    isSaving: true,
  },
};

export const WithoutGraphId: Story = {
  args: {
    goal: 'This goal uses onSave callback instead of graphId.',
    layerNumber: 5,
    onSave: async (goal: string) => {
      console.log('Saving goal:', goal);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};
