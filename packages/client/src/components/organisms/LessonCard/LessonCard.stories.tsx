import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { LessonCard } from './LessonCard';
import { Book, Play } from 'lucide-react';
import { Button } from '../../atoms/Button';

const meta: Meta<typeof LessonCard> = {
  title: 'Organisms/LessonCard',
  component: LessonCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LessonCard>;

export const NotStarted: Story = {
  args: {
    id: '1',
    title: 'Introduction to React',
    description: 'Learn the fundamentals of React and component-based development.',
    duration: 30,
    status: 'not-started',
    icon: Book,
  },
};

export const InProgress: Story = {
  args: {
    id: '2',
    title: 'State Management',
    description: 'Understanding how to manage state in React applications.',
    duration: 45,
    progress: 60,
    status: 'in-progress',
    icon: Book,
  },
};

export const Completed: Story = {
  args: {
    id: '3',
    title: 'React Hooks',
    description: 'Master React hooks including useState, useEffect, and custom hooks.',
    duration: 60,
    progress: 100,
    status: 'completed',
    icon: Book,
  },
};

export const Locked: Story = {
  args: {
    id: '4',
    title: 'Advanced Patterns',
    description: 'This lesson is locked until prerequisites are completed.',
    duration: 90,
    status: 'locked',
    icon: Book,
  },
};

export const WithActions: Story = {
  args: {
    id: '5',
    title: 'Lesson with Actions',
    description: 'This lesson has action buttons.',
    duration: 30,
    progress: 25,
    status: 'in-progress',
    icon: Book,
    actions: (
      <>
        <Button variant="primary" size="sm" icon={Play}>
          Continue
        </Button>
      </>
    ),
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <LessonCard
        id="1"
        title="Not Started Lesson"
        duration={30}
        status="not-started"
        icon={Book}
      />
      <LessonCard
        id="2"
        title="In Progress Lesson"
        duration={45}
        progress={60}
        status="in-progress"
        icon={Book}
      />
      <LessonCard
        id="3"
        title="Completed Lesson"
        duration={60}
        progress={100}
        status="completed"
        icon={Book}
      />
      <LessonCard
        id="4"
        title="Locked Lesson"
        duration={90}
        status="locked"
        icon={Book}
      />
    </div>
  ),
};
