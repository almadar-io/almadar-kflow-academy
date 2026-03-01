import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { useState } from 'react';
import { PlacementTest, type PlacementQuestion, type PlacementAnswer, type PlacementTestResult } from './PlacementTest';

const meta: Meta<typeof PlacementTest> = {
  title: 'Organisms/PlacementTest',
  component: PlacementTest,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PlacementTest>;

const mockQuestions: PlacementQuestion[] = [
  {
    id: '1',
    question: 'What is a closure in JavaScript?',
    type: 'multiple_choice',
    options: [
      'A function that has access to variables in its outer scope',
      'A way to close a function',
      'A JavaScript keyword',
      'A type of loop',
    ],
    difficulty: 'beginner',
  },
  {
    id: '2',
    question: 'JavaScript is a compiled language.',
    type: 'true_false',
    difficulty: 'intermediate',
  },
  {
    id: '3',
    question: 'Explain the difference between let, const, and var.',
    type: 'short_answer',
    difficulty: 'advanced',
  },
];

const mockResult: PlacementTestResult = {
  assessedLevel: 'intermediate',
  beginnerScore: 0.8,
  intermediateScore: 0.6,
  advancedScore: 0.4,
};

const PlacementTestWrapper = (args: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, PlacementAnswer>>(new Map());
  const [showResults, setShowResults] = useState(false);

  const handleAnswerSelect = (questionId: string, answer: string | string[]) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      questionId,
      answer,
      isCorrect: false,
      answeredAt: Date.now(),
    });
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < mockQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <PlacementTest
      {...args}
      questions={mockQuestions}
      currentQuestionIndex={currentIndex}
      answers={answers}
      result={showResults ? mockResult : undefined}
      showResults={showResults}
      onAnswerSelect={handleAnswerSelect}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onSubmit={() => setShowResults(true)}
    />
  );
};

export const Default: Story = {
  render: (args: any) => <PlacementTestWrapper {...args} />,
  args: {
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    questions: [],
    isLoading: true,
  },
};

export const Error: Story = {
  args: {
    questions: [],
    error: 'Failed to load placement test. Please try again.',
    isLoading: false,
  },
};

export const Results: Story = {
  args: {
    questions: mockQuestions,
    result: mockResult,
    showResults: true,
    onComplete: (result: { assessedLevel: 'beginner' | 'intermediate' | 'advanced' }) => {
      console.log('Test completed:', result);
    },
  },
};
