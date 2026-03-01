import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { SegmentRenderer } from './SegmentRenderer';
import { parseLessonSegments } from './parseLessonSegments';

const meta: Meta<typeof SegmentRenderer> = {
  title: 'Organisms/LessonSegments/SegmentRenderer',
  component: SegmentRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onSaveActivation: { action: 'activation saved' },
    onSaveReflection: { action: 'reflection saved' },
    onAnswerBloom: { action: 'bloom answered' },
  },
};

export default meta;
type Story = StoryObj<typeof SegmentRenderer>;

const sampleLesson = `# React Components

<activate>
What do you already know about React components? Think about how you might structure a component in your own words.
</activate>

<connect>
You've already learned about **JavaScript functions** and **JSX syntax**. In this lesson, we'll build on that knowledge to understand how React components work.
</connect>

## What are Components?

React components are reusable pieces of UI. They can be written as functions or classes.

\`\`\`javascript
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
\`\`\`

<reflect>
How does this concept relate to what you learned earlier? Can you think of a real-world example?
</reflect>

<bloom level="apply">
<question>
Write a React component that displays a greeting message.
</question>
<answer>
\`\`\`javascript
function Greeting({ name }) {
  return <div>Hello, {name}!</div>;
}
\`\`\`
</answer>
</bloom>

<question>
What is the purpose of props in React?
</question>
<answer>
Props allow you to pass data from parent components to child components. They are read-only and help make components reusable.
</answer>
`;

export const FullLesson: Story = {
  args: {
    segments: parseLessonSegments(sampleLesson),
  },
};

export const WithUserProgress: Story = {
  args: {
    segments: parseLessonSegments(sampleLesson),
    userProgress: {
      activationResponse: 'I know that React components are reusable pieces of UI.',
      reflectionNotes: ['This connects to the previous lesson on JavaScript functions.'],
      bloomAnswered: { 0: true },
    },
  },
};

export const MarkdownOnly: Story = {
  args: {
    segments: parseLessonSegments('# Simple Markdown\n\nThis is just markdown content with no special tags.'),
  },
};

export const WithCodeBlocks: Story = {
  args: {
    segments: parseLessonSegments(`# Code Example

Here's some JavaScript:

\`\`\`javascript
function example() {
  return 'Hello';
}
\`\`\`

And here's some Python:

\`\`\`python
def example():
    return 'Hello'
\`\`\``),
  },
};
