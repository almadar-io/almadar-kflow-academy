import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { NotePage } from './NotePage';
import { Note } from '../../features/notes/types';

const meta: Meta<typeof NotePage> = {
  title: 'Pages/NotePage',
  component: NotePage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onNoteSelect: { action: 'note selected' },
    onNoteClick: { action: 'note clicked' },
    onNoteDelete: { action: 'note deleted' },
    onNoteCreate: { action: 'note created' },
    onNoteEdit: { action: 'note edited' },
    onViewModeChange: { action: 'view mode changed' },
    onSearchChange: { action: 'search changed' },
    onBack: { action: 'back clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof NotePage>;

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Main Note',
    content: 'This is the main note content',
    tags: ['important'],
    parentId: undefined,
    children: [],
    level: 0,
    isExpanded: true,
  },
  {
    id: '2',
    title: 'Child Note 1',
    content: 'This is a child note',
    tags: [],
    parentId: '1',
    children: [],
    level: 1,
    isExpanded: false,
  },
  {
    id: '3',
    title: 'Child Note 2',
    content: 'Another child note',
    tags: ['todo'],
    parentId: '1',
    children: [],
    level: 1,
    isExpanded: false,
  },
];

const mockCurrentNote: Note = mockNotes[0];
const mockSelectedNote: Note = mockNotes[0];

export const Default: Story = {
  args: {
    currentNoteId: '1',
    currentNote: mockCurrentNote,
    selectedNote: mockSelectedNote,
    notes: mockNotes,
    viewMode: 'list',
    searchQuery: '',
    user: {
      name: 'User',
      email: 'user@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'notes', label: 'Notes', active: true },
    ],
  },
};

export const MindMapView: Story = {
  args: {
    currentNoteId: '1',
    currentNote: mockCurrentNote,
    selectedNote: mockSelectedNote,
    notes: mockNotes,
    viewMode: 'mindmap',
    searchQuery: '',
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const WithSearch: Story = {
  args: {
    currentNoteId: '1',
    currentNote: mockCurrentNote,
    selectedNote: mockSelectedNote,
    notes: mockNotes,
    viewMode: 'list',
    searchQuery: 'child',
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Loading: Story = {
  args: {
    currentNoteId: '1',
    loading: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const NoteNotFound: Story = {
  args: {
    currentNoteId: '999',
    currentNote: null,
    notes: mockNotes,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
