import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { LearnPage } from './LearnPage';
import type { Concept } from '../../features/concepts/types';
import type { ConceptGraph } from '../../features/concepts/types';

const meta: Meta<typeof LearnPage> = {
  title: 'Pages/LearnPage',
  component: LearnPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onCreateNewPath: { action: 'create new path' },
    onLearningPathClick: { action: 'learning path clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof LearnPage>;

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

const mockGraph: ConceptGraph = {
  id: 'graph-1',
  concepts: new Map([['React', mockSeedConcept]]),
};

const mockLearningPaths = [
  {
    graph: mockGraph,
    seedConcept: mockSeedConcept,
    conceptCount: 10,
    levelCount: 3,
  },
];

export const Default: Story = {
  args: {
    learningPaths: mockLearningPaths,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'learn', label: 'Learn', active: true },
    ],
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Empty: Story = {
  args: {
    learningPaths: [],
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const WithError: Story = {
  args: {
    learningPaths: [],
    error: 'Failed to load learning paths',
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
