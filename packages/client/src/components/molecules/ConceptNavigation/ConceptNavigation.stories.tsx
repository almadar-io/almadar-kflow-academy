import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptNavigation } from './ConceptNavigation';

const meta: Meta<typeof ConceptNavigation> = {
  title: 'Molecules/ConceptNavigation',
  component: ConceptNavigation,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onPreviousClick: { action: 'previous clicked' },
    onNextClick: { action: 'next clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof ConceptNavigation>;

export const BothDirections: Story = {
  args: {
    previousConcept: {
      id: 'concept-1',
      name: 'React Fundamentals',
    },
    nextConcept: {
      id: 'concept-3',
      name: 'State Management',
    },
  },
};

export const PreviousOnly: Story = {
  args: {
    previousConcept: {
      id: 'concept-1',
      name: 'React Fundamentals',
    },
  },
};

export const NextOnly: Story = {
  args: {
    nextConcept: {
      id: 'concept-3',
      name: 'State Management',
    },
  },
};

export const LongNames: Story = {
  args: {
    previousConcept: {
      id: 'concept-1',
      name: 'Advanced React Patterns: Higher-Order Components and Render Props',
    },
    nextConcept: {
      id: 'concept-3',
      name: 'State Management with Redux Toolkit and Modern React Hooks',
    },
  },
};
