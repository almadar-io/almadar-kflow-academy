import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ProgressTracker } from './ProgressTracker';
import { Book, Clock, Target } from 'lucide-react';

const meta: Meta<typeof ProgressTracker> = {
  title: 'Organisms/ProgressTracker',
  component: ProgressTracker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProgressTracker>;

const sampleLessons = [
  { id: '1', title: 'Introduction', status: 'completed' as const, onClick: () => {} },
  { id: '2', title: 'Getting Started', status: 'completed' as const, onClick: () => {} },
  { id: '3', title: 'Current Lesson', status: 'current' as const, onClick: () => {} },
  { id: '4', title: 'Next Lesson', status: 'upcoming' as const, onClick: () => {} },
  { id: '5', title: 'Locked Lesson', status: 'locked' as const, onClick: () => {} },
];

export const Default: Story = {
  args: {
    progress: 40,
    totalLessons: 10,
    completedLessons: 4,
    currentLesson: {
      id: '3',
      title: 'React Components',
      status: 'current',
      onClick: () => alert('Continue learning'),
    },
    nextLesson: {
      id: '4',
      title: 'State Management',
      status: 'upcoming',
      onClick: () => alert('Start lesson'),
    },
  },
};

export const WithStatistics: Story = {
  args: {
    progress: 65,
    totalLessons: 20,
    completedLessons: 13,
    statistics: [
      { label: 'Lessons', value: '13/20', icon: Book },
      { label: 'Time Spent', value: '8.5h', icon: Clock },
      { label: 'Streak', value: '7 days', icon: Target },
    ],
    currentLesson: {
      id: '14',
      title: 'Advanced Patterns',
      status: 'current',
      onClick: () => {},
    },
  },
};

export const WithLessonsList: Story = {
  args: {
    progress: 50,
    totalLessons: 5,
    completedLessons: 2,
    lessons: sampleLessons,
  },
};

export const Completed: Story = {
  args: {
    progress: 100,
    totalLessons: 10,
    completedLessons: 10,
    showCelebration: true,
    statistics: [
      { label: 'Lessons', value: '10/10', icon: Book },
      { label: 'Time Spent', value: '15h', icon: Clock },
    ],
  },
};

export const Starting: Story = {
  args: {
    progress: 0,
    totalLessons: 10,
    completedLessons: 0,
    nextLesson: {
      id: '1',
      title: 'Introduction to React',
      status: 'upcoming',
      onClick: () => alert('Start learning'),
    },
  },
};
