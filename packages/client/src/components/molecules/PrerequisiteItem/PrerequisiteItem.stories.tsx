import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { PrerequisiteItem } from './PrerequisiteItem';

const meta: Meta<typeof PrerequisiteItem> = {
  title: 'Molecules/PrerequisiteItem',
  component: PrerequisiteItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onView: { action: 'viewed' },
    onAdd: { action: 'added' },
    onRemove: { action: 'removed' },
  },
};

export default meta;
type Story = StoryObj<typeof PrerequisiteItem>;

export const Existing: Story = {
  args: {
    name: 'JavaScript Basics',
    isMissing: false,
    variant: 'detail',
    onView: () => {},
  },
};

export const Missing: Story = {
  args: {
    name: 'React Fundamentals',
    isMissing: true,
    variant: 'detail',
    onAdd: () => {},
    onRemove: () => {},
  },
};

export const WithDescription: Story = {
  args: {
    name: 'TypeScript Basics',
    isMissing: false,
    description: 'Understanding types, interfaces, and generics',
    variant: 'detail',
    onView: () => {},
  },
};

export const ListVariant: Story = {
  args: {
    name: 'HTML & CSS',
    isMissing: false,
    variant: 'list',
    onView: () => {},
  },
};
