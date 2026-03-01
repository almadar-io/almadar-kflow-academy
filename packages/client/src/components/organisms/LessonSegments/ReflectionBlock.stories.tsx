import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ReflectionBlock } from './ReflectionBlock';

const meta: Meta<typeof ReflectionBlock> = {
  title: 'Organisms/LessonSegments/ReflectionBlock',
  component: ReflectionBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onSave: { action: 'saved' },
  },
};

export default meta;
type Story = StoryObj<typeof ReflectionBlock>;

export const Default: Story = {
  args: {
    prompt: 'How does this concept relate to what you learned earlier? Can you think of a real-world example?',
    index: 0,
  },
};

export const WithSavedNote: Story = {
  args: {
    prompt: 'How does this concept relate to what you learned earlier? Can you think of a real-world example?',
    index: 0,
    savedNote: 'This connects to the previous lesson on state management. A real-world example would be a shopping cart that needs to share state across multiple components.',
  },
};

export const MultipleReflections: Story = {
  args: {
    prompt: 'What questions do you still have about this topic?',
    index: 1,
  },
};
