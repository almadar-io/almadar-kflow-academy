import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ContentReadinessIndicator } from './ContentReadinessIndicator';

const meta: Meta<typeof ContentReadinessIndicator> = {
  title: 'Molecules/ContentReadinessIndicator',
  component: ContentReadinessIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['lesson', 'flashcards', 'quiz', 'assessment'],
    },
    status: {
      control: 'select',
      options: ['ready', 'draft', 'missing', 'error'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ContentReadinessIndicator>;

// Status variants
export const Ready: Story = {
  args: {
    type: 'lesson',
    status: 'ready',
    showLabel: true,
  },
};

export const Draft: Story = {
  args: {
    type: 'lesson',
    status: 'draft',
    showLabel: true,
  },
};

export const Missing: Story = {
  args: {
    type: 'flashcards',
    status: 'missing',
    showLabel: true,
  },
};

export const Error: Story = {
  args: {
    type: 'quiz',
    status: 'error',
    showLabel: true,
  },
};

// Content types
export const Lesson: Story = {
  args: {
    type: 'lesson',
    status: 'ready',
    showLabel: true,
  },
};

export const Flashcards: Story = {
  args: {
    type: 'flashcards',
    status: 'ready',
    count: 12,
    showLabel: true,
  },
};

export const Quiz: Story = {
  args: {
    type: 'quiz',
    status: 'draft',
    count: 5,
    showLabel: true,
  },
};

export const Assessment: Story = {
  args: {
    type: 'assessment',
    status: 'ready',
    showLabel: true,
  },
};

// Sizes
export const Small: Story = {
  args: {
    type: 'lesson',
    status: 'ready',
    size: 'sm',
    showLabel: true,
  },
};

export const Medium: Story = {
  args: {
    type: 'lesson',
    status: 'ready',
    size: 'md',
    showLabel: true,
  },
};

export const Large: Story = {
  args: {
    type: 'lesson',
    status: 'ready',
    size: 'lg',
    showLabel: true,
  },
};

// Without label
export const IconOnly: Story = {
  args: {
    type: 'flashcards',
    status: 'ready',
    count: 8,
    showLabel: false,
  },
};

// All statuses together
export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <ContentReadinessIndicator type="lesson" status="ready" showLabel />
        <ContentReadinessIndicator type="lesson" status="draft" showLabel />
        <ContentReadinessIndicator type="lesson" status="missing" showLabel />
        <ContentReadinessIndicator type="lesson" status="error" showLabel />
      </div>
      <div className="flex gap-4">
        <ContentReadinessIndicator type="flashcards" status="ready" count={10} showLabel />
        <ContentReadinessIndicator type="quiz" status="draft" count={5} showLabel />
        <ContentReadinessIndicator type="assessment" status="ready" showLabel />
      </div>
    </div>
  ),
};
