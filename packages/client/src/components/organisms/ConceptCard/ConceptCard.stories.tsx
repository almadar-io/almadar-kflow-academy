import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptCard } from './ConceptCard';
import { Book, Edit, Trash2, Plus } from 'lucide-react';

const meta: Meta<typeof ConceptCard> = {
  title: 'Organisms/ConceptCard',
  component: ConceptCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConceptCard>;

export const Default: Story = {
  args: {
    id: '1',
    name: 'React Fundamentals',
    description: 'Learn the basics of React including components, props, and state.',
    layer: 1,
    progress: 75,
  },
};

export const WithPrerequisites: Story = {
  args: {
    id: '2',
    name: 'Advanced React',
    description: 'Deep dive into React hooks, context, and performance optimization.',
    layer: 2,
    prerequisites: ['React Fundamentals', 'JavaScript ES6'],
    progress: 45,
  },
};

export const WithOperations: Story = {
  args: {
    id: '3',
    name: 'State Management',
    description: 'Understanding Redux and state management patterns.',
    layer: 1,
    operations: [
      { label: 'Edit', icon: Edit, onClick: () => alert('Edit clicked') },
      { label: 'Add Child', icon: Plus, onClick: () => alert('Add child clicked') },
      { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => alert('Delete clicked') },
    ],
  },
};

export const WithChildren: Story = {
  args: {
    id: '4',
    name: 'Parent Concept',
    description: 'This concept has child concepts.',
    layer: 0,
    expanded: true,
    childConcepts: [
      {
        id: '4-1',
        name: 'Child Concept 1',
        description: 'First child concept',
        layer: 1,
      },
      {
        id: '4-2',
        name: 'Child Concept 2',
        description: 'Second child concept',
        layer: 1,
      },
    ],
  },
};

export const WithIcon: Story = {
  args: {
    id: '5',
    name: 'Concept with Icon',
    description: 'This concept has an icon.',
    icon: Book,
    layer: 1,
    progress: 100,
  },
};

export const Complete: Story = {
  args: {
    id: '6',
    name: 'Complete Concept',
    description: 'A complete concept card with all features.',
    layer: 2,
    prerequisites: ['Prerequisite 1', 'Prerequisite 2'],
    progress: 60,
    icon: Book,
    operations: [
      { label: 'Edit', icon: Edit, onClick: () => {} },
      { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => {} },
    ],
    expanded: true,
    childConcepts: [
      {
        id: '6-1',
        name: 'Sub-concept 1',
        layer: 3,
      },
    ],
  },
};
