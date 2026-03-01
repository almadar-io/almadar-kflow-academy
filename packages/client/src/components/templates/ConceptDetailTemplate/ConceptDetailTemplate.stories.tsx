import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptDetailTemplate } from './ConceptDetailTemplate';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Sparkles, BookOpen, Zap } from 'lucide-react';

const meta: Meta<typeof ConceptDetailTemplate> = {
  title: 'Templates/ConceptDetailTemplate',
  component: ConceptDetailTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConceptDetailTemplate>;

// Mock concept header
const MockConceptHeader = () => (
  <div className="space-y-4">
    <Typography variant="h4">React Hooks</Typography>
    <Typography variant="body" color="secondary">
      React Hooks are functions that let you use state and other React features 
      without writing a class. They allow you to reuse stateful logic between components.
    </Typography>
    <div className="flex flex-wrap gap-2">
      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded">
        Parent: JavaScript Fundamentals
      </span>
      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded">
        Prereq: ES6 Features
      </span>
    </div>
  </div>
);

// Mock lesson panel
const MockLessonPanel = () => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <Typography variant="h5">Lesson Content</Typography>
      <Button variant="secondary" size="sm" icon={BookOpen}>
        Generate Lesson
      </Button>
    </div>
    <div className="prose dark:prose-invert max-w-none">
      <h3>Introduction to React Hooks</h3>
      <p>
        React Hooks were introduced in React 16.8 as a way to use state and other 
        React features without writing a class component. They provide a more direct 
        API to the React concepts you already know: props, state, context, refs, and lifecycle.
      </p>
      <h4>useState Hook</h4>
      <p>
        The <code>useState</code> hook allows you to add state to functional components:
      </p>
      <pre><code>{`const [count, setCount] = useState(0);`}</code></pre>
    </div>
  </Card>
);

// Mock flashcards section
const MockFlashcardsSection = () => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <Typography variant="h5">Flashcards</Typography>
      <Button variant="secondary" size="sm" icon={Zap}>
        Generate Flashcards
      </Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { front: 'What is useState?', back: 'A hook that adds state to functional components' },
        { front: 'What is useEffect?', back: 'A hook for side effects in functional components' },
        { front: 'What is useContext?', back: 'A hook to consume context values' },
      ].map((card, index) => (
        <Card key={index} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
          <Typography variant="body" weight="medium" className="mb-2">
            Q: {card.front}
          </Typography>
          <Typography variant="small" color="secondary">
            A: {card.back}
          </Typography>
        </Card>
      ))}
    </div>
  </Card>
);

// Mock operation panel
const MockOperationPanel = () => (
  <div className="space-y-4">
    <Button variant="secondary" icon={Sparkles} fullWidth>
      Explain Concept
    </Button>
    <Button variant="secondary" icon={BookOpen} fullWidth>
      Generate Lesson
    </Button>
    <Button variant="secondary" icon={Zap} fullWidth>
      Generate Flashcards
    </Button>
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <Typography variant="small" color="secondary" className="mb-2">
        Custom Operation
      </Typography>
      <textarea
        className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
        placeholder="Enter custom prompt..."
        rows={3}
      />
      <Button variant="primary" size="sm" className="mt-2" fullWidth>
        Execute
      </Button>
    </div>
  </div>
);

export const Default: Story = {
  args: {
    concept: {
      id: 'concept-1',
      name: 'React Hooks',
      description: 'Functions that let you use state and other React features without writing a class',
      layer: 2,
      isSeed: false,
    },
    conceptHeader: <MockConceptHeader />,
    lessonPanel: <MockLessonPanel />,
    flashcardSection: <MockFlashcardsSection />,
    operationPanel: <MockOperationPanel />,
    onBack: () => console.log('Back clicked'),
  },
};

export const WithOperationPanelOpen: Story = {
  args: {
    ...Default.args,
    isOperationPanelOpen: true,
  },
};

export const SeedConcept: Story = {
  args: {
    concept: {
      id: 'concept-1',
      name: 'JavaScript',
      description: 'A high-level, interpreted programming language',
      layer: 0,
      isSeed: true,
    },
    conceptHeader: <MockConceptHeader />,
    lessonPanel: <MockLessonPanel />,
    onBack: () => console.log('Back clicked'),
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Error: Story = {
  args: {
    error: 'Failed to load concept. Please try again.',
    onBack: () => console.log('Back clicked'),
  },
};

export const WithCustomContent: Story = {
  args: {
    concept: {
      id: 'concept-1',
      name: 'Custom Concept',
      layer: 1,
    },
    onBack: () => console.log('Back clicked'),
    children: (
      <Card className="p-6">
        <Typography variant="h5" className="mb-4">
          Custom Content
        </Typography>
        <Typography variant="body" color="secondary">
          This template supports custom children content as an alternative to the 
          default tabs layout. Use this for specialized concept views.
        </Typography>
      </Card>
    ),
  },
};

export const NoFlashcards: Story = {
  args: {
    concept: {
      id: 'concept-1',
      name: 'New Concept',
      layer: 1,
    },
    conceptHeader: <MockConceptHeader />,
    lessonPanel: <MockLessonPanel />,
    // No flashcardSection - tabs should only show Content
    onBack: () => console.log('Back clicked'),
  },
};
