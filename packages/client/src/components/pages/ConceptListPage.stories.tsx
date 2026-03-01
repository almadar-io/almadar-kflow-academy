import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptListPage } from './ConceptListPage';
import type { Concept } from '../../features/concepts/types';

const meta: Meta<typeof ConceptListPage> = {
  title: 'Pages/ConceptListPage',
  component: ConceptListPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onSelectConcept: { action: 'concept selected' },
    onGoalSave: { action: 'goal saved' },
    onLayerGoalUpdate: { action: 'layer goal updated' },
    onNavigateToParent: { action: 'navigate to parent' },
    onViewPrerequisite: { action: 'view prerequisite' },
    onAddPrerequisite: { action: 'add prerequisite' },
    onRemovePrerequisite: { action: 'remove prerequisite' },
    onLoadMoreLayers: { action: 'load more layers' },
  },
};

export default meta;
type Story = StoryObj<typeof ConceptListPage>;

const mockSeedConcept: Concept = {
  id: 'seed-1',
  name: 'React',
  description: 'A JavaScript library',
  layer: 0,
  isSeed: true,
  parents: [],
  children: [],
  prerequisites: [],
};

const mockConcepts: Concept[] = [
  mockSeedConcept,
  {
    id: 'concept-1',
    name: 'Components',
    description: 'Building blocks',
    layer: 1,
    isSeed: false,
    parents: ['React'],
    children: [],
    prerequisites: [],
  },
  {
    id: 'concept-2',
    name: 'Props',
    description: 'Component properties',
    layer: 1,
    isSeed: false,
    parents: ['Components'],
    children: [],
    prerequisites: [],
  },
  {
    id: 'concept-3',
    name: 'State',
    description: 'Component state',
    layer: 2,
    isSeed: false,
    parents: ['Components'],
    children: [],
    prerequisites: ['Props'],
  },
];

export const Default: Story = {
  args: {
    relatedConcepts: mockConcepts,
    seedConcept: mockSeedConcept,
    selectedConcept: mockSeedConcept,
    onSelectConcept: () => {},
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'concepts', label: 'Concepts', active: true },
    ],
  },
};

export const WithGoal: Story = {
  args: {
    relatedConcepts: mockConcepts,
    seedConcept: mockSeedConcept,
    selectedConcept: mockSeedConcept,
    goal: {
      id: 'goal-1',
      text: 'Learn React fundamentals',
      milestones: [
        { id: 'm1', text: 'Understand components', completed: true },
        { id: 'm2', text: 'Master hooks', completed: false },
      ],
    },
    onSelectConcept: () => {},
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const WithLayerGoals: Story = {
  args: {
    relatedConcepts: mockConcepts,
    seedConcept: mockSeedConcept,
    selectedConcept: mockSeedConcept,
    layerGoals: {
      L0: 'Master the fundamentals',
      L1: 'Build complex components',
      L2: 'Advanced patterns',
    },
    onSelectConcept: () => {},
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Loading: Story = {
  args: {
    relatedConcepts: [],
    seedConcept: null,
    selectedConcept: null,
    isLoading: true,
    onSelectConcept: () => {},
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Empty: Story = {
  args: {
    relatedConcepts: [],
    seedConcept: null,
    selectedConcept: null,
    onSelectConcept: () => {},
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
