import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MentorConceptListView } from './MentorConceptListView';
import { Plus, RefreshCw, Target } from 'lucide-react';

const meta: Meta<typeof MentorConceptListView> = {
  title: 'Organisms/MentorConceptListView',
  component: MentorConceptListView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MentorConceptListView>;

const sampleConcepts = [
  {
    id: '1',
    name: 'React Fundamentals',
    description: 'Learn the basics of React',
    layer: 1,
    progress: 75,
  },
  {
    id: '2',
    name: 'State Management',
    description: 'Understanding state in React',
    layer: 1,
    progress: 50,
  },
  {
    id: '3',
    name: 'Advanced Patterns',
    description: 'Advanced React patterns',
    layer: 2,
    progress: 25,
  },
];

export const Default: Story = {
  args: {
    graphSummary: {
      totalConcepts: 15,
      totalLayers: 3,
      completedConcepts: 5,
    },
    learningGoal: {
      id: '1',
      goal: 'Master React and build a full-stack application',
      icon: Target,
      milestones: [
        { id: '1', text: 'Learn Components', completed: true },
        { id: '2', text: 'Master Hooks', completed: false },
      ],
    },
    layers: [
      {
        number: 1,
        concepts: sampleConcepts.slice(0, 2),
        operations: [
          {
            id: 'add',
            label: 'Add Concept',
            icon: Plus,
            variant: 'primary' as const,
            onClick: () => alert('Add concept'),
          },
        ],
      },
      {
        number: 2,
        concepts: sampleConcepts.slice(2),
      },
    ],
    layerOperations: {
      title: 'Graph Operations',
      operations: [
        {
          id: 'generate',
          label: 'Generate Layer',
          icon: Plus,
          variant: 'primary' as const,
          onClick: () => alert('Generate layer'),
        },
        {
          id: 'refresh',
          label: 'Refresh',
          icon: RefreshCw,
          onClick: () => alert('Refresh'),
        },
      ],
    },
    onConceptSelect: (id: string) => alert(`Selected concept: ${id}`),
  },
};

export const WithoutGoal: Story = {
  args: {
    graphSummary: {
      totalConcepts: 10,
      totalLayers: 2,
      completedConcepts: 3,
    },
    layers: [
      {
        number: 1,
        concepts: sampleConcepts.slice(0, 2),
      },
    ],
  },
};

export const MultipleLayers: Story = {
  args: {
    graphSummary: {
      totalConcepts: 20,
      totalLayers: 4,
      completedConcepts: 8,
    },
    layers: [
      {
        number: 1,
        concepts: sampleConcepts,
      },
      {
        number: 2,
        concepts: [
          {
            id: '4',
            name: 'Layer 2 Concept',
            layer: 2,
          },
        ],
      },
      {
        number: 3,
        concepts: [],
      },
    ],
  },
};
