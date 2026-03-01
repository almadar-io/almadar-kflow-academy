import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ContentReadinessCard } from './ContentReadinessCard';

const meta: Meta<typeof ContentReadinessCard> = {
  title: 'Organisms/ContentReadinessCard',
  component: ContentReadinessCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ContentReadinessCard>;

// All ready
export const AllReady: Story = {
  args: {
    id: 'concept-1',
    title: 'Introduction to React Hooks',
    description: 'Learn the fundamentals of React Hooks including useState, useEffect, and custom hooks.',
    lessonStatus: 'ready',
    flashcardCount: 10,
    flashcardStatus: 'ready',
    quizStatus: 'ready',
    isPublished: true,
    layerNumber: 1,
    onClick: () => alert('Card clicked'),
    onEdit: () => alert('Edit clicked'),
    onPreview: () => alert('Preview clicked'),
    onDelete: () => alert('Delete clicked'),
  },
};

// Draft with missing content
export const DraftMissing: Story = {
  args: {
    id: 'concept-2',
    title: 'State Management Patterns',
    description: 'Explore different state management approaches in React applications.',
    lessonStatus: 'draft',
    flashcardCount: 0,
    flashcardStatus: 'missing',
    quizStatus: 'missing',
    isPublished: false,
    layerNumber: 2,
    onClick: () => alert('Card clicked'),
    onEdit: () => alert('Edit clicked'),
    onPreview: () => alert('Preview clicked'),
    onDelete: () => alert('Delete clicked'),
  },
};

// With checkbox selected
export const Selected: Story = {
  args: {
    id: 'concept-3',
    title: 'Component Composition',
    description: 'Master the art of composing React components for reusable UI.',
    lessonStatus: 'ready',
    flashcardCount: 8,
    flashcardStatus: 'ready',
    quizStatus: 'draft',
    isPublished: false,
    isSelected: true,
    showCheckbox: true,
    layerNumber: 3,
    onClick: () => alert('Card clicked'),
    onSelect: (selected) => alert(`Selected: ${selected}`),
    onEdit: () => alert('Edit clicked'),
  },
};

// With checkbox unselected
export const WithCheckbox: Story = {
  args: {
    id: 'concept-4',
    title: 'Performance Optimization',
    lessonStatus: 'ready',
    flashcardCount: 5,
    flashcardStatus: 'draft',
    quizStatus: 'ready',
    isPublished: true,
    showCheckbox: true,
    onClick: () => alert('Card clicked'),
    onSelect: (selected) => alert(`Selected: ${selected}`),
  },
};

// Error state
export const WithError: Story = {
  args: {
    id: 'concept-5',
    title: 'Error Handling',
    description: 'Learn proper error handling techniques in React.',
    lessonStatus: 'error',
    flashcardCount: 3,
    flashcardStatus: 'error',
    quizStatus: 'missing',
    isPublished: false,
    onEdit: () => alert('Edit clicked'),
    onDelete: () => alert('Delete clicked'),
  },
};

// Minimal (no actions)
export const Minimal: Story = {
  args: {
    id: 'concept-6',
    title: 'React Context',
    lessonStatus: 'ready',
    flashcardCount: 6,
    flashcardStatus: 'ready',
    quizStatus: 'ready',
    isPublished: true,
  },
};

// Long title
export const LongTitle: Story = {
  args: {
    id: 'concept-7',
    title: 'Understanding the Complete Lifecycle of React Components from Mounting to Unmounting',
    description: 'A comprehensive guide to understanding how React components behave throughout their entire lifecycle.',
    lessonStatus: 'ready',
    flashcardCount: 15,
    flashcardStatus: 'ready',
    quizStatus: 'draft',
    isPublished: false,
    layerNumber: 4,
    onEdit: () => alert('Edit clicked'),
  },
};

// Grid of cards
export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[800px]">
      <ContentReadinessCard
        id="1"
        title="Introduction"
        lessonStatus="ready"
        flashcardCount={5}
        flashcardStatus="ready"
        quizStatus="ready"
        isPublished={true}
        layerNumber={1}
        showCheckbox
      />
      <ContentReadinessCard
        id="2"
        title="Getting Started"
        lessonStatus="ready"
        flashcardCount={8}
        flashcardStatus="draft"
        quizStatus="missing"
        isPublished={false}
        layerNumber={1}
        showCheckbox
      />
      <ContentReadinessCard
        id="3"
        title="Core Concepts"
        lessonStatus="draft"
        flashcardCount={0}
        flashcardStatus="missing"
        quizStatus="missing"
        isPublished={false}
        layerNumber={2}
        showCheckbox
        isSelected
      />
      <ContentReadinessCard
        id="4"
        title="Advanced Topics"
        lessonStatus="ready"
        flashcardCount={12}
        flashcardStatus="ready"
        quizStatus="ready"
        isPublished={true}
        layerNumber={3}
        showCheckbox
      />
    </div>
  ),
};
