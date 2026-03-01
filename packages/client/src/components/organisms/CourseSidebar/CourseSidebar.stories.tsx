import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CourseSidebar } from './CourseSidebar';

const meta: Meta<typeof CourseSidebar> = {
  title: 'Organisms/CourseSidebar',
  component: CourseSidebar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CourseSidebar>;

const sampleModules = [
  {
    id: '1',
    title: 'Module 1: Introduction',
    expanded: true,
    lessons: [
      { id: '1-1', title: 'Welcome', status: 'completed' as const, duration: 5 },
      { id: '1-2', title: 'Getting Started', status: 'completed' as const, duration: 10 },
      { id: '1-3', title: 'Current Lesson', status: 'current' as const, duration: 15 },
      { id: '1-4', title: 'Next Lesson', status: 'upcoming' as const, duration: 20 },
    ],
  },
  {
    id: '2',
    title: 'Module 2: Fundamentals',
    expanded: false,
    lessons: [
      { id: '2-1', title: 'Basics', status: 'upcoming' as const, duration: 25 },
      { id: '2-2', title: 'Advanced', status: 'locked' as const, duration: 30 },
    ],
  },
];

export const Default: Story = {
  args: {
    title: 'React Mastery Course',
    progress: 45,
    modules: sampleModules,
    currentLessonId: '1-3',
  },
};

export const HighProgress: Story = {
  args: {
    title: 'Advanced JavaScript',
    progress: 85,
    modules: [
      {
        id: '1',
        title: 'Module 1',
        expanded: true,
        lessons: [
          { id: '1-1', title: 'Lesson 1', status: 'completed' as const },
          { id: '1-2', title: 'Lesson 2', status: 'completed' as const },
          { id: '1-3', title: 'Lesson 3', status: 'current' as const },
        ],
      },
    ],
    currentLessonId: '1-3',
  },
};

export const Starting: Story = {
  args: {
    title: 'New Course',
    progress: 0,
    modules: [
      {
        id: '1',
        title: 'Module 1',
        expanded: true,
        lessons: [
          { id: '1-1', title: 'First Lesson', status: 'upcoming' as const },
          { id: '1-2', title: 'Second Lesson', status: 'locked' as const },
        ],
      },
    ],
  },
};
