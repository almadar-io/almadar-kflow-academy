import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { PrerequisiteList } from './PrerequisiteList';
import { Concept, ConceptGraph } from '../../../features/concepts/types';

const meta: Meta<typeof PrerequisiteList> = {
  title: 'Organisms/PrerequisiteList',
  component: PrerequisiteList,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onViewPrerequisite: { action: 'viewed prerequisite' },
    onAddPrerequisite: { action: 'added prerequisite' },
    onRemovePrerequisite: { action: 'removed prerequisite' },
  },
};

export default meta;
type Story = StoryObj<typeof PrerequisiteList>;

const mockConcept: Concept = {
  id: 'concept-1',
  name: 'React Hooks',
  description: 'Learn about React hooks',
  parents: [],
  children: [],
  prerequisites: ['JavaScript Basics', 'React Components', 'ES6 Features'],
};

const mockGraph: ConceptGraph = {
  id: 'graph-1',
  seedConceptId: 'seed-1',
  concepts: new Map([
    ['JavaScript Basics', { id: 'js-1', name: 'JavaScript Basics', description: '', parents: [], children: [] }],
    ['React Components', { id: 'react-1', name: 'React Components', description: '', parents: [], children: [] }],
  ]),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const Default: Story = {
  args: {
    concept: mockConcept,
    graph: mockGraph,
    variant: 'detail',
    onViewPrerequisite: () => {},
    onAddPrerequisite: () => {},
    onRemovePrerequisite: () => {},
  },
};

export const ListVariant: Story = {
  args: {
    concept: mockConcept,
    graph: mockGraph,
    variant: 'list',
    onViewPrerequisite: () => {},
    onAddPrerequisite: () => {},
    onRemovePrerequisite: () => {},
  },
};

export const NoPrerequisites: Story = {
  args: {
    concept: {
      ...mockConcept,
      prerequisites: [],
    },
    graph: mockGraph,
    onViewPrerequisite: () => {},
    onAddPrerequisite: () => {},
    onRemovePrerequisite: () => {},
  },
};
