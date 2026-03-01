import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { FlashCard } from './FlashCard';
import { useState } from 'react';

const meta: Meta<typeof FlashCard> = {
  title: 'Organisms/FlashCard',
  component: FlashCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FlashCard>;

const FlashCardWrapper = (args: Story['args']) => {
  const [flipped, setFlipped] = useState(false);
  const [studied, setStudied] = useState(false);
  return (
    <FlashCard
      {...args}
      flipped={flipped}
      onFlipChange={setFlipped}
      studied={studied}
      onMarkStudied={() => setStudied(true)}
      onReset={() => {
        setFlipped(false);
        setStudied(false);
      }}
    />
  );
};

export const Default: Story = {
  render: (args: Story['args']) => <FlashCardWrapper {...args} />,
  args: {
    id: '1',
    front: 'What is React?',
    back: 'React is a JavaScript library for building user interfaces, particularly web applications.',
  },
};

export const WithProgress: Story = {
  render: (args: Story['args']) => <FlashCardWrapper {...args} />,
  args: {
    id: '2',
    front: 'What is JSX?',
    back: 'JSX is a syntax extension for JavaScript that allows you to write HTML-like code in JavaScript.',
    currentCard: 3,
    totalCards: 10,
    onNext: () => alert('Next card'),
    onPrevious: () => alert('Previous card'),
  },
};

export const Studied: Story = {
  render: (args: Story['args']) => <FlashCardWrapper {...args} />,
  args: {
    id: '3',
    front: 'What are React Hooks?',
    back: 'React Hooks are functions that let you use state and other React features in functional components.',
    studied: true,
  },
};

export const WithNavigation: Story = {
  render: (args: Story['args']) => <FlashCardWrapper {...args} />,
  args: {
    id: '4',
    front: 'What is useState?',
    back: 'useState is a React Hook that allows you to add state to functional components.',
    currentCard: 5,
    totalCards: 20,
    onNext: () => alert('Next'),
    onPrevious: () => alert('Previous'),
  },
};
