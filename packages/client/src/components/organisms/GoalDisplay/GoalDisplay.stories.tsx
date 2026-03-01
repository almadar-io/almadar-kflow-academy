import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { GoalDisplay } from './GoalDisplay';
import { Target, Book } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof GoalDisplay> = {
  title: 'Organisms/GoalDisplay',
  component: GoalDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof GoalDisplay>;

const GoalDisplayWrapper = (args: Story['args']) => {
  const [goal, setGoal] = useState(args.goal);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (newGoal: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setGoal(newGoal);
    setLoading(false);
    setEditing(false);
  };

  return (
    <GoalDisplay
      {...args}
      goal={goal}
      editing={editing}
      onEditingChange={setEditing}
      onSave={handleSave}
      loading={loading}
    />
  );
};

export const Default: Story = {
  render: (args: Story['args']) => <GoalDisplayWrapper {...args} />,
  args: {
    id: '1',
    goal: 'Master React and build a full-stack application',
    icon: Target,
  },
};

export const WithMilestones: Story = {
  render: (args: Story['args']) => <GoalDisplayWrapper {...args} />,
  args: {
    id: '2',
    goal: 'Complete the React Fundamentals course',
    icon: Book,
    milestones: [
      { id: '1', text: 'Learn Components', completed: true },
      { id: '2', text: 'Master Hooks', completed: true },
      { id: '3', text: 'Build Project', completed: false },
    ],
  },
};

export const Editing: Story = {
  render: (args: Story['args']) => <GoalDisplayWrapper {...args} />,
  args: {
    id: '3',
    goal: 'This goal is being edited',
    icon: Target,
    editing: true,
  },
};
