import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConnectionBlock } from './ConnectionBlock';

const meta: Meta<typeof ConnectionBlock> = {
  title: 'Organisms/LessonSegments/ConnectionBlock',
  component: ConnectionBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConnectionBlock>;

export const Default: Story = {
  args: {
    content: `You've already learned about **React components** and **props**. In this lesson, we'll build on that knowledge to understand how components can share state and communicate with each other.`,
  },
};

export const WithList: Story = {
  args: {
    content: `Building on concepts you've mastered:

- **JavaScript fundamentals**: Variables, functions, and objects
- **React basics**: Components and JSX
- **State management**: useState hook

Now we'll explore **Context API** to share state across components.`,
  },
};

export const Complex: Story = {
  args: {
    content: `## What You Know

You've successfully completed lessons on:

1. **Component Structure**: How to create and organize React components
2. **Props**: Passing data from parent to child components
3. **State**: Managing component-level state with \`useState\`

## What's Next

In this lesson, you'll learn how to:
- Share state across multiple components
- Avoid prop drilling
- Use Context API effectively`,
  },
};
