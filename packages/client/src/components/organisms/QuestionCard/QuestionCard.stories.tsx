import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { QuestionCard } from './QuestionCard';
import { useState } from 'react';

const meta: Meta<typeof QuestionCard> = {
  title: 'Organisms/QuestionCard',
  component: QuestionCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QuestionCard>;

const singleChoiceOptions = [
  { id: '1', label: 'Option A', value: 'a' },
  { id: '2', label: 'Option B', value: 'b' },
  { id: '3', label: 'Option C', value: 'c' },
  { id: '4', label: 'Option D', value: 'd' },
];

const multipleChoiceOptions = [
  { id: '1', label: 'React', value: 'react' },
  { id: '2', label: 'Vue', value: 'vue' },
  { id: '3', label: 'Angular', value: 'angular' },
  { id: '4', label: 'Svelte', value: 'svelte' },
];

export const SingleChoice: Story = {
  args: {
    id: '1',
    question: 'What is the capital of France?',
    type: 'single-choice',
    options: singleChoiceOptions,
    helpText: 'Select the correct answer from the options below.',
    currentQuestion: 1,
    totalQuestions: 5,
    onAnswerChange: (answer: string | string[]) => console.log('Answer:', answer),
    onNext: () => alert('Next question'),
  },
};

export const MultipleChoice: Story = {
  args: {
    id: '2',
    question: 'Which frameworks have you used? (Select all that apply)',
    type: 'multiple-choice',
    options: multipleChoiceOptions,
    currentQuestion: 2,
    totalQuestions: 5,
    onAnswerChange: (answer: string | string[]) => console.log('Answers:', answer),
    onNext: () => alert('Next question'),
    onPrevious: () => alert('Previous question'),
  },
};

export const TextAnswer: Story = {
  args: {
    id: '3',
    question: 'Explain your understanding of React hooks.',
    type: 'text',
    helpText: 'Provide a detailed explanation in your own words.',
    currentQuestion: 3,
    totalQuestions: 5,
    onAnswerChange: (answer: string | string[]) => console.log('Answer:', answer),
    onNext: () => alert('Next question'),
    onPrevious: () => alert('Previous question'),
  },
};

export const WithSkip: Story = {
  args: {
    id: '4',
    question: 'This question can be skipped.',
    type: 'single-choice',
    options: singleChoiceOptions,
    showSkip: true,
    onSkip: () => alert('Question skipped'),
    onNext: () => alert('Next question'),
  },
};

export const WithoutProgress: Story = {
  args: {
    id: '5',
    question: 'Question without progress indicator',
    type: 'single-choice',
    options: singleChoiceOptions,
    onAnswerChange: (answer: string | string[]) => console.log('Answer:', answer),
  },
};
