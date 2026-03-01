import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { AssessmentCard } from './AssessmentCard';
import { useState } from 'react';

const meta: Meta<typeof AssessmentCard> = {
  title: 'Organisms/AssessmentCard',
  component: AssessmentCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AssessmentCard>;

const sampleQuestions = [
  {
    id: '1',
    question: 'What is React?',
    type: 'single-choice' as const,
    options: [
      { id: '1', label: 'A JavaScript library', value: 'library' },
      { id: '2', label: 'A programming language', value: 'language' },
      { id: '3', label: 'A database', value: 'database' },
    ],
    correctAnswer: 'library',
    points: 10,
  },
  {
    id: '2',
    question: 'Which of the following are React hooks? (Select all that apply)',
    type: 'multiple-choice' as const,
    options: [
      { id: '1', label: 'useState', value: 'usestate' },
      { id: '2', label: 'useEffect', value: 'useeffect' },
      { id: '3', label: 'useComponent', value: 'usecomponent' },
    ],
    correctAnswer: ['usestate', 'useeffect'],
    points: 15,
  },
  {
    id: '3',
    question: 'Explain the difference between props and state.',
    type: 'text' as const,
    points: 20,
  },
];

export const Default: Story = {
  args: {
    id: '1',
    title: 'React Fundamentals Assessment',
    description: 'Test your knowledge of React basics.',
    questions: sampleQuestions,
    onSubmit: (answers: Record<string, string | string[]>) => alert(`Submitted: ${JSON.stringify(answers)}`),
  },
};

export const WithResults: Story = {
  args: {
    id: '2',
    title: 'React Fundamentals Assessment',
    description: 'Test your knowledge of React basics.',
    questions: sampleQuestions,
    showResults: true,
    answers: {
      '1': 'library',
      '2': ['usestate', 'useeffect'],
      '3': 'Props are passed down, state is internal',
    },
  },
};

export const Loading: Story = {
  args: {
    id: '3',
    title: 'Submitting Assessment',
    description: 'Please wait while we process your answers.',
    questions: sampleQuestions,
    loading: true,
  },
};
