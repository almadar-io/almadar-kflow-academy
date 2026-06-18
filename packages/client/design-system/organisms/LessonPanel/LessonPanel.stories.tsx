import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { LessonPanel } from './LessonPanel';
import { useState } from 'react';
import { SegmentRenderer } from '../LessonSegments';
import { parseLessonSegments } from '../LessonSegments/parseLessonSegments';

const meta: Meta<typeof LessonPanel> = {
  title: 'Organisms/LessonPanel',
  component: LessonPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LessonPanel>;

const sampleLesson = `
# Introduction to React

React is a JavaScript library for building user interfaces.

## Key Concepts

1. **Components**: Reusable pieces of UI
2. **Props**: Data passed to components
3. **State**: Component's internal data

## Example

\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
\`\`\`
`;

const lessonWithLearningScienceTags = `
<activate>
What do you already know about building user interfaces with JavaScript?
</activate>

<connect>
This builds on:
- **JavaScript Basics**: Understanding variables, functions, and objects
- **HTML & CSS**: Creating structure and styling for web pages
</connect>

# Introduction to React

React is a JavaScript library for building user interfaces. It was created by Facebook and is now maintained by a community of developers.

## Key Concepts

1. **Components**: Reusable pieces of UI that can be composed together
2. **Props**: Data passed to components to customize their behavior
3. **State**: Component's internal data that can change over time

## Example

\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
\`\`\`

<reflect>
How might React components help you organize your code better than writing everything in one file?
</reflect>

## Practice Questions

<bloom level="remember">
<question>What is React?</question>
<answer>React is a JavaScript library for building user interfaces, created by Facebook.</answer>
</bloom>

<bloom level="understand">
<question>What is the difference between props and state?</question>
<answer>Props are data passed into a component from its parent, while state is internal data managed by the component itself.</answer>
</bloom>

<bloom level="apply">
<question>Write a React component that displays a counter that increments when clicked.</question>
<answer>
\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
\`\`\`
</answer>
</bloom>
`;

const LessonPanelWrapper = (args: Story['args']) => {
  const [editing, setEditing] = useState(false);
  const [lesson, setLesson] = useState(args?.renderedLesson || '');
  
  // Parse segments if lesson content is provided
  const segments = parseLessonSegments(lesson);
  const lessonContent = segments.length > 0 ? (
    <SegmentRenderer segments={segments} />
  ) : undefined;

  return (
    <LessonPanel
      {...args}
      renderedLesson={lesson}
      lessonContent={lessonContent}
      isEditing={editing}
      onEdit={() => setEditing(true)}
      onCancelEdit={() => setEditing(false)}
      onSaveLesson={(newLesson) => {
        setLesson(newLesson);
        setEditing(false);
      }}
    />
  );
};

export const Default: Story = {
  render: (args: Story['args']) => <LessonPanelWrapper {...args} />,
  args: {
    renderedLesson: sampleLesson,
    conceptHasLesson: true,
  },
};

export const WithPrerequisites: Story = {
  render: (args: Story['args']) => <LessonPanelWrapper {...args} />,
  args: {
    renderedLesson: sampleLesson,
    conceptHasLesson: true,
    prerequisites: [
      { id: '1', name: 'JavaScript Basics' },
      { id: '2', name: 'HTML & CSS' },
    ],
    onViewPrerequisite: (name: string) => alert(`View prerequisite: ${name}`),
  },
};

export const WithGenerationButtons: Story = {
  render: (args: Story['args']) => <LessonPanelWrapper {...args} />,
  args: {
    renderedLesson: '',
    conceptHasLesson: false,
    showGenerationButtons: true,
    onGenerateLesson: (simple?: boolean) => alert(`Generate ${simple ? 'quick' : 'detailed'} lesson`),
    onGenerateFlashCards: () => alert('Generate flashcards'),
  },
};

export const Generating: Story = {
  args: {
    renderedLesson: '',
    conceptHasLesson: false,
    showGenerationButtons: true,
    isGenerating: true,
    onGenerateLesson: () => {},
  },
};

export const Editing: Story = {
  render: (args: Story['args']) => <LessonPanelWrapper {...args} />,
  args: {
    renderedLesson: sampleLesson,
    conceptHasLesson: true,
    isEditing: true,
  },
};

export const WithLearningScienceTags: Story = {
  render: (args: Story['args']) => <LessonPanelWrapper {...args} />,
  args: {
    renderedLesson: lessonWithLearningScienceTags,
    conceptHasLesson: true,
  },
};

export const WithLearningScienceTagsAndPrerequisites: Story = {
  render: (args: Story['args']) => <LessonPanelWrapper {...args} />,
  args: {
    renderedLesson: lessonWithLearningScienceTags,
    conceptHasLesson: true,
    prerequisites: [
      { id: '1', name: 'JavaScript Basics' },
      { id: '2', name: 'HTML & CSS' },
    ],
    onViewPrerequisite: (name: string) => alert(`View prerequisite: ${name}`),
  },
};
