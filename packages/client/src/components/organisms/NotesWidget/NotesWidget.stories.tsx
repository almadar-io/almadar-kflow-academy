import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { NotesWidget } from './NotesWidget';
import { Concept } from '../../../features/concepts/types';

const meta: Meta<typeof NotesWidget> = {
  title: 'Organisms/NotesWidget',
  component: NotesWidget,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onOpen: { action: 'opened' },
    onClose: { action: 'closed' },
  },
};

export default meta;
type Story = StoryObj<typeof NotesWidget>;

const mockConcept: Concept = {
  id: 'concept-1',
  name: 'React Components',
  description: 'Learn about React components',
  parents: [],
  children: [],
  notes: [
    {
      id: 'note-1',
      text: 'Components are reusable pieces of UI',
      timestamp: Date.now() - 86400000,
    },
    {
      id: 'note-2',
      text: 'Props allow passing data to components',
      selectedText: 'React components can accept props',
      timestamp: Date.now() - 43200000,
    },
  ],
};

export const Default: Story = {
  args: {
    concept: mockConcept,
    showFloatingButton: true,
  },
};

export const WithSelectedText: Story = {
  args: {
    concept: mockConcept,
    selectedText: 'React components are reusable pieces of UI.',
    showFloatingButton: false,
    isOpen: true,
  },
};

export const WithoutFloatingButton: Story = {
  args: {
    concept: mockConcept,
    showFloatingButton: false,
    isOpen: true,
  },
};

export const EmptyNotes: Story = {
  args: {
    concept: {
      ...mockConcept,
      notes: [],
    },
    showFloatingButton: false,
    isOpen: true,
  },
};

export const NoConcept: Story = {
  args: {
    concept: null,
    showFloatingButton: false,
    isOpen: true,
  },
};

