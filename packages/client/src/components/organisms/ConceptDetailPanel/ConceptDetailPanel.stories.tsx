import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptDetailPanel } from './ConceptDetailPanel';
import { Book, Edit, Trash2, Plus } from 'lucide-react';
import { Typography } from '../../atoms/Typography';

const meta: Meta<typeof ConceptDetailPanel> = {
  title: 'Organisms/ConceptDetailPanel',
  component: ConceptDetailPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConceptDetailPanel>;

export const Default: Story = {
  args: {
    id: '1',
    name: 'React Fundamentals',
    description: 'Learn the core concepts of React including components, props, state, and lifecycle methods.',
    icon: Book,
    layer: 1,
    metadata: [
      { label: 'Duration', value: '2 hours' },
      { label: 'Difficulty', value: 'Beginner' },
      { label: 'Lessons', value: 5 },
    ],
    relationships: {
      prerequisites: ['JavaScript Basics', 'HTML & CSS'],
      children: ['React Hooks', 'State Management'],
    },
  },
};

export const WithLessonContent: Story = {
  args: {
    id: '2',
    name: 'Advanced React Patterns',
    description: 'Deep dive into advanced React patterns and best practices.',
    icon: Book,
    layer: 2,
    lessonContent: (
      <div className="space-y-4">
        <Typography variant="h6">Lesson Content</Typography>
        <Typography variant="body">
          This is the lesson content. It can contain any React elements including
          code examples, images, and interactive components.
        </Typography>
      </div>
    ),
    lessonProgress: 75,
  },
};

export const WithFlashcards: Story = {
  args: {
    id: '3',
    name: 'React Hooks',
    description: 'Understanding React hooks and their usage.',
    icon: Book,
    flashcards: [
      { id: '1', front: 'What is useState?', back: 'A React Hook that allows you to add state to functional components.' },
      { id: '2', front: 'What is useEffect?', back: 'A React Hook that lets you perform side effects in functional components.' },
    ],
  },
};

export const WithOperations: Story = {
  args: {
    id: '4',
    name: 'Concept with Operations',
    description: 'This concept has operation buttons.',
    icon: Book,
    operations: [
      { label: 'Edit', icon: Edit, onClick: () => alert('Edit clicked') },
      { label: 'Add Child', icon: Plus, onClick: () => alert('Add child clicked') },
      { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => alert('Delete clicked') },
    ],
  },
};

export const Complete: Story = {
  args: {
    id: '5',
    name: 'Complete Concept',
    description: 'A complete concept detail panel with all features.',
    icon: Book,
    layer: 2,
    lessonProgress: 60,
    metadata: [
      { label: 'Duration', value: '3 hours' },
      { label: 'Difficulty', value: 'Intermediate' },
    ],
    relationships: {
      prerequisites: ['Prerequisite 1'],
      children: ['Child 1', 'Child 2'],
    },
    flashcards: [
      { id: '1', front: 'Question 1', back: 'Answer 1' },
    ],
    lessonContent: (
      <Typography variant="body">
        Complete lesson content goes here.
      </Typography>
    ),
    operations: [
      { label: 'Edit', icon: Edit, onClick: () => {} },
    ],
  },
};
