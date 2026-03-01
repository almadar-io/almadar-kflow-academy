import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MentorConceptListPage } from './MentorConceptListPage';
import type { ConceptLayer } from '../templates/KnowledgeGraphTemplate';
import type { Operation } from '../organisms/OperationPanel';

const meta: Meta<typeof MentorConceptListPage> = {
  title: 'Pages/MentorConceptListPage',
  component: MentorConceptListPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onOperationExecute: { action: 'operation executed' },
    onConceptClick: { action: 'concept clicked' },
    onAddConcept: { action: 'add concept' },
  },
};

export default meta;
type Story = StoryObj<typeof MentorConceptListPage>;

const mockLayers: ConceptLayer[] = [
  {
    id: 'L0',
    name: 'Layer 0',
    color: '#8b5cf6',
    concepts: [
      {
        id: 'concept-1',
        name: 'React',
        description: 'A JavaScript library',
        layer: 0,
      },
    ],
  },
  {
    id: 'L1',
    name: 'Layer 1',
    color: '#3b82f6',
    concepts: [
      {
        id: 'concept-2',
        name: 'Components',
        description: 'Building blocks',
        layer: 1,
      },
    ],
  },
];

const mockOperations: Operation[] = [
  {
    id: 'expand',
    label: 'Expand Graph',
    icon: 'Sparkles' as any,
    variant: 'primary',
    onClick: async () => {},
  },
];

export const Default: Story = {
  args: {
    graphId: 'graph-1',
    goal: {
      id: 'goal-1',
      text: 'Learn React fundamentals',
      milestones: [
        { id: 'm1', text: 'Understand components', completed: true },
        { id: 'm2', text: 'Master hooks', completed: false },
      ],
    },
    layers: mockLayers,
    graphNodes: [],
    graphEdges: [],
    operations: mockOperations,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'mentor', label: 'Mentor', active: true },
    ],
  },
};

export const Loading: Story = {
  args: {
    graphId: 'graph-1',
    loading: true,
    layers: [],
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Empty: Story = {
  args: {
    graphId: 'graph-1',
    layers: [],
    graphNodes: [],
    graphEdges: [],
    operations: [],
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
