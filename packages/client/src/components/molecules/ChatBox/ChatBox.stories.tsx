import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ChatBox, type ChatMessage } from './ChatBox';

const meta: Meta<typeof ChatBox> = {
  title: 'Molecules/ChatBox',
  component: ChatBox,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChatBox>;

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'What is React?',
    timestamp: new Date(Date.now() - 10000),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'React is a JavaScript library for building user interfaces, particularly web applications. It allows you to create reusable UI components and manage the state of your application efficiently.',
    timestamp: new Date(Date.now() - 5000),
  },
  {
    id: '3',
    role: 'user',
    content: 'How does it work?',
    timestamp: new Date(),
  },
];

export const Default: Story = {
  args: {
    messages: mockMessages,
    onSend: (message: string) => {
      console.log('Sending message:', message);
    },
    placeholder: 'Type your message...',
  },
};

export const Empty: Story = {
  args: {
    messages: [],
    onSend: (message: string) => {
      console.log('Sending message:', message);
    },
    placeholder: 'Start a conversation...',
  },
};

export const Loading: Story = {
  args: {
    messages: mockMessages,
    loading: true,
    onSend: (message: string) => {
      console.log('Sending message:', message);
    },
  },
};

export const LongMessages: Story = {
  args: {
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'Can you explain the concept of closures in JavaScript?',
        timestamp: new Date(Date.now() - 20000),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned. This allows the inner function to "remember" the environment in which it was created. Closures are commonly used for data privacy, creating function factories, and implementing callbacks.',
        timestamp: new Date(Date.now() - 15000),
      },
      {
        id: '3',
        role: 'user',
        content: 'That\'s helpful! Can you give me an example?',
        timestamp: new Date(Date.now() - 10000),
      },
      {
        id: '4',
        role: 'assistant',
        content: 'Sure! Here\'s a simple example:\n\n```javascript\nfunction outerFunction(x) {\n  // Outer function\'s variable\n  return function innerFunction(y) {\n    // Inner function has access to x\n    return x + y;\n  };\n}\n\nconst addFive = outerFunction(5);\nconsole.log(addFive(3)); // Output: 8\n```\n\nIn this example, `innerFunction` forms a closure over `x`, allowing it to access `x` even after `outerFunction` has finished executing.',
        timestamp: new Date(Date.now() - 5000),
      },
    ],
    onSend: (message: string) => {
      console.log('Sending message:', message);
    },
  },
};

export const ManyMessages: Story = {
  args: {
    messages: Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: i % 2 === 0 
        ? `User message ${i + 1}`
        : `This is a longer assistant response for message ${i + 1}. It contains multiple sentences to demonstrate how the chat interface handles longer content.`,
      timestamp: new Date(Date.now() - (20 - i) * 1000),
    })),
    onSend: (message: string) => {
      console.log('Sending message:', message);
    },
  },
};
