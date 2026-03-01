import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { FlashcardStudyTemplate } from './FlashcardStudyTemplate';
import { useState } from 'react';

const meta: Meta<typeof FlashcardStudyTemplate> = {
  title: 'Templates/FlashcardStudyTemplate',
  component: FlashcardStudyTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FlashcardStudyTemplate>;

const mockCards = [
  { id: '1', question: 'What is React?', answer: 'A JavaScript library for building user interfaces.' },
  { id: '2', question: 'What is JSX?', answer: 'A syntax extension for JavaScript that allows you to write HTML-like code in JS.' },
  { id: '3', question: 'What is a component?', answer: 'A reusable piece of UI that can have its own logic and appearance.' },
  { id: '4', question: 'What is state?', answer: "Data that can change over time and affects the component's output." },
  { id: '5', question: 'What are props?', answer: 'Read-only data passed from parent to child components.' },
  { id: '6', question: 'What is the virtual DOM?', answer: 'A lightweight copy of the DOM that React uses to optimize updates.' },
  { id: '7', question: 'What is useState?', answer: 'A hook that lets you add state to functional components.' },
  { id: '8', question: 'What is useEffect?', answer: 'A hook that lets you perform side effects in functional components.' },
];

const InteractiveStudy = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({
    total: mockCards.length,
    studied: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    streak: 0,
  });
  const [showCompletion, setShowCompletion] = useState(false);

  const handleDifficulty = (cardId: string, difficulty: 'hard' | 'medium' | 'easy') => {
    setStats(prev => ({
      ...prev,
      studied: prev.studied + 1,
      [difficulty]: prev[difficulty] + 1,
    }));
  };

  const handleComplete = () => {
    setShowCompletion(true);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setStats({
      total: mockCards.length,
      studied: 0,
      easy: 0,
      medium: 0,
      hard: 0,
      streak: 0,
    });
    setShowCompletion(false);
  };

  return (
    <FlashcardStudyTemplate
      title="React Fundamentals"
      cards={mockCards}
      currentIndex={currentIndex}
      onIndexChange={setCurrentIndex}
      onDifficultyRating={handleDifficulty}
      stats={stats}
      onShuffle={() => console.log('Shuffle')}
      onReset={handleReset}
      onExit={() => console.log('Exit')}
      onComplete={handleComplete}
      showCompletionModal={showCompletion}
      onCloseCompletionModal={() => setShowCompletion(false)}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveStudy />,
};

export const FirstCard: Story = {
  args: {
    title: 'React Fundamentals',
    cards: mockCards,
    currentIndex: 0,
    stats: {
      total: 8,
      studied: 0,
      easy: 0,
      medium: 0,
      hard: 0,
    },
  },
};

export const MidSession: Story = {
  args: {
    title: 'React Fundamentals',
    cards: mockCards,
    currentIndex: 4,
    stats: {
      total: 8,
      studied: 4,
      easy: 2,
      medium: 1,
      hard: 1,
    },
  },
};

export const NearCompletion: Story = {
  args: {
    title: 'React Fundamentals',
    cards: mockCards,
    currentIndex: 7,
    stats: {
      total: 8,
      studied: 7,
      easy: 4,
      medium: 2,
      hard: 1,
    },
  },
};

export const Completed: Story = {
  args: {
    title: 'React Fundamentals',
    cards: mockCards,
    currentIndex: 7,
    stats: {
      total: 8,
      studied: 8,
      easy: 5,
      medium: 2,
      hard: 1,
    },
    showCompletionModal: true,
  },
};

export const Mobile: Story = {
  render: () => <InteractiveStudy />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

