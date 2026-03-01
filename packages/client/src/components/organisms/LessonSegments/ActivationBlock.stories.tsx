import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ActivationBlock } from './ActivationBlock';

const meta: Meta<typeof ActivationBlock> = {
  title: 'Organisms/LessonSegments/ActivationBlock',
  component: ActivationBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onSave: { action: 'saved' },
  },
};

export default meta;
type Story = StoryObj<typeof ActivationBlock>;

export const Default: Story = {
  args: {
    question: 'What do you already know about React components? Think about how you might structure a component in your own words.',
  },
};

export const WithSavedResponse: Story = {
  args: {
    question: 'What do you already know about React components? Think about how you might structure a component in your own words.',
    savedResponse: 'I know that React components are reusable pieces of UI that can accept props and manage state.',
  },
};

export const ShortQuestion: Story = {
  args: {
    question: 'What is your experience with JavaScript?',
  },
};

export const LongQuestion: Story = {
  args: {
    question: 'Before we dive into advanced state management patterns, take a moment to reflect on your current understanding. What challenges have you faced when managing state in React applications? Have you worked with Context API, Redux, or other state management solutions? What worked well for you, and what didn\'t?',
  },
};
