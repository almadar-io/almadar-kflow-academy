import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { LessonEditorTemplate } from './LessonEditorTemplate';
import { useState } from 'react';

const meta: Meta<typeof LessonEditorTemplate> = {
  title: 'Templates/LessonEditorTemplate',
  component: LessonEditorTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LessonEditorTemplate>;

const sampleContent = `# Understanding React Hooks

React Hooks are functions that let you use state and other React features without writing a class.

## useState Hook

The useState hook lets you add state to functional components:

\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

## useEffect Hook

The useEffect hook lets you perform side effects in functional components:

\`\`\`jsx
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

## Key Points

- Hooks can only be called at the top level
- Hooks can only be called from React functions
- Custom hooks let you reuse stateful logic
`;

const InteractiveEditor = () => {
  const [title, setTitle] = useState('Understanding React Hooks');
  const [content, setContent] = useState(sampleContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  return (
    <LessonEditorTemplate
      id="lesson-1"
      title={title}
      onTitleChange={(t) => {
        setTitle(t);
        setHasUnsavedChanges(true);
      }}
      content={content}
      onContentChange={(c) => {
        setContent(c);
        setHasUnsavedChanges(true);
      }}
      prerequisites={[
        { id: '1', name: 'JavaScript Basics' },
        { id: '2', name: 'React Fundamentals' },
      ]}
      hasUnsavedChanges={hasUnsavedChanges}
      lastSaved="2 minutes ago"
      isPublished={true}
      user={{ name: 'Jane Mentor', email: 'jane@example.com' }}
      onSave={() => {
        setHasUnsavedChanges(false);
        console.log('Saved');
      }}
      onPublish={() => console.log('Published')}
      onBack={() => console.log('Back')}
      onGenerateLesson={(simple) => console.log('Generate lesson:', simple)}
      onGenerateFlashCards={() => console.log('Generate flashcards')}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveEditor />,
};

export const NewLesson: Story = {
  args: {
    id: null,
    title: '',
    content: '',
    prerequisites: [],
    hasUnsavedChanges: false,
    isPublished: false,
    user: { name: 'Jane Mentor', email: 'jane@example.com' },
    onTitleChange: () => {},
    onContentChange: () => {},
  },
};

export const Draft: Story = {
  args: {
    id: 'lesson-1',
    title: 'Work in Progress',
    content: '# Draft content\n\nThis is a draft lesson...',
    prerequisites: [],
    hasUnsavedChanges: true,
    isPublished: false,
    user: { name: 'Jane Mentor', email: 'jane@example.com' },
    onTitleChange: () => {},
    onContentChange: () => {},
  },
};

export const Generating: Story = {
  args: {
    id: 'lesson-1',
    title: 'AI Generated Lesson',
    content: '',
    isGenerating: true,
    user: { name: 'Jane Mentor', email: 'jane@example.com' },
    onTitleChange: () => {},
    onContentChange: () => {},
  },
};

export const WithError: Story = {
  args: {
    id: 'lesson-1',
    title: 'Lesson with Error',
    content: sampleContent,
    error: 'Failed to save lesson. Please try again.',
    user: { name: 'Jane Mentor', email: 'jane@example.com' },
    onTitleChange: () => {},
    onContentChange: () => {},
  },
};

export const Mobile: Story = {
  render: () => <InteractiveEditor />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

