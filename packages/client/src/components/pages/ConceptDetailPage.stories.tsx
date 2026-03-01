import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptDetailPage } from './ConceptDetailPage';
import type { Concept } from '../../features/concepts/types';

const meta: Meta<typeof ConceptDetailPage> = {
  title: 'Pages/ConceptDetailPage',
  component: ConceptDetailPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onNavigateToPrevious: { action: 'navigate to previous' },
    onNavigateToNext: { action: 'navigate to next' },
    onNavigateToParent: { action: 'navigate to parent' },
    onNavigateToChild: { action: 'navigate to child' },
    onViewPrerequisite: { action: 'view prerequisite' },
    onAddPrerequisite: { action: 'add prerequisite' },
    onRemovePrerequisite: { action: 'remove prerequisite' },
    onGenerateLesson: { action: 'generate lesson' },
    onSelectConcept: { action: 'select concept' },
  },
};

export default meta;
type Story = StoryObj<typeof ConceptDetailPage>;

const mockConcept: Concept = {
  id: 'concept-1',
  name: 'React',
  description: 'A JavaScript library for building user interfaces',
  layer: 0,
  isSeed: true,
  parents: [],
  children: [],
  prerequisites: [],
};

const mockPreviousConcept: Concept = {
  id: 'concept-0',
  name: 'JavaScript',
  description: 'Programming language',
  layer: 0,
  isSeed: false,
  parents: [],
  children: [],
  prerequisites: [],
};

const mockNextConcept: Concept = {
  id: 'concept-2',
  name: 'Components',
  description: 'Building blocks of React',
  layer: 1,
  isSeed: false,
  parents: [],
  children: [],
  prerequisites: [],
};

export const Default: Story = {
  args: {
    concept: mockConcept,
    previousConcept: mockPreviousConcept,
    nextConcept: mockNextConcept,
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

export const WithLesson: Story = {
  args: {
    concept: {
      ...mockConcept,
      lesson: 'React is a powerful library for building user interfaces...',
    },
    previousConcept: mockPreviousConcept,
    nextConcept: mockNextConcept,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const WithPrerequisites: Story = {
  args: {
    concept: {
      ...mockConcept,
      prerequisites: ['JavaScript', 'HTML', 'CSS'],
    },
    previousConcept: mockPreviousConcept,
    nextConcept: mockNextConcept,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const GeneratingLesson: Story = {
  args: {
    concept: mockConcept,
    previousConcept: mockPreviousConcept,
    nextConcept: mockNextConcept,
    isGeneratingLesson: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const WithLayerGoals: Story = {
  args: {
    concept: mockConcept,
    previousConcept: mockPreviousConcept,
    nextConcept: mockNextConcept,
    layerGoals: {
      L0: 'Master the fundamentals',
      L1: 'Build complex components',
    },
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
