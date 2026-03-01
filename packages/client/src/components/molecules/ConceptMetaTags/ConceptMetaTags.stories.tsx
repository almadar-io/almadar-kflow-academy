import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptMetaTags } from './ConceptMetaTags';

const meta: Meta<typeof ConceptMetaTags> = {
  title: 'Molecules/ConceptMetaTags',
  component: ConceptMetaTags,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onNavigateToParent: { action: 'navigated to parent' },
  },
};

export default meta;
type Story = StoryObj<typeof ConceptMetaTags>;

export const Default: Story = {
  args: {
    layer: 2,
    isSeed: false,
    parents: ['Parent Concept 1', 'Parent Concept 2'],
    onNavigateToParent: () => {},
  },
};

export const SeedConcept: Story = {
  args: {
    layer: 0,
    isSeed: true,
    parents: [],
    onNavigateToParent: () => {},
  },
};

export const WithParents: Story = {
  args: {
    layer: 3,
    isSeed: false,
    parents: ['React Basics', 'JavaScript Fundamentals'],
    onNavigateToParent: () => {},
  },
};

export const NoLayer: Story = {
  args: {
    parents: ['Parent Concept'],
    onNavigateToParent: () => {},
  },
};
