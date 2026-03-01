import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { QuestionWidget } from './QuestionWidget';
import { Concept } from '../../../features/concepts/types';

const meta: Meta<typeof QuestionWidget> = {
  title: 'Organisms/QuestionWidget',
  component: QuestionWidget,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onAnswer: { action: 'answered' },
    onOpen: { action: 'opened' },
    onClose: { action: 'closed' },
  },
};

export default meta;
type Story = StoryObj<typeof QuestionWidget>;

const mockConcept: Concept = {
  id: 'concept-1',
  name: 'React Components',
  description: 'Learn about React components',
  parents: [],
  children: [],
  questions: [
    {
      question: 'What is a React component?',
      answer: 'A React component is a reusable piece of UI that can accept props and manage state.',
      timestamp: Date.now() - 86400000,
    },
  ],
};

export const Default: Story = {
  args: {
    conceptGraphId: 'graph-1',
    conceptId: 'concept-1',
    concept: mockConcept,
    showFloatingButton: true,
  },
};

export const WithSelectedText: Story = {
  args: {
    conceptGraphId: 'graph-1',
    conceptId: 'concept-1',
    concept: mockConcept,
    selectedText: 'React components are reusable pieces of UI.',
    showFloatingButton: false,
    isOpen: true,
  },
};

export const WithoutFloatingButton: Story = {
  args: {
    conceptGraphId: 'graph-1',
    conceptId: 'concept-1',
    concept: mockConcept,
    showFloatingButton: false,
    isOpen: true,
  },
};

export const EmptyQuestions: Story = {
  args: {
    conceptGraphId: 'graph-1',
    conceptId: 'concept-1',
    concept: {
      ...mockConcept,
      questions: [],
    },
    showFloatingButton: false,
    isOpen: true,
  },
};

