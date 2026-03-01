import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Globe, Trash2, Copy, Download, Tags } from 'lucide-react';
import { 
  BulkActionBar, 
  createPublishAction,
  createDeleteAction,
  createDuplicateAction,
  createExportAction,
} from './BulkActionBar';

const meta: Meta<typeof BulkActionBar> = {
  title: 'Organisms/BulkActionBar',
  component: BulkActionBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-48 relative">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BulkActionBar>;

// Default with common actions
export const Default: Story = {
  args: {
    selectedCount: 5,
    totalCount: 20,
    itemType: 'concepts',
    actions: [
      createPublishAction(() => alert('Publish clicked')),
      createDuplicateAction(() => alert('Duplicate clicked')),
      createDeleteAction(() => alert('Delete clicked')),
    ],
    onSelectAll: () => alert('Select all clicked'),
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'bottom',
  },
};

// All selected
export const AllSelected: Story = {
  args: {
    selectedCount: 20,
    totalCount: 20,
    itemType: 'lessons',
    allSelected: true,
    actions: [
      createPublishAction(() => alert('Publish clicked')),
      createExportAction(() => alert('Export clicked')),
    ],
    onSelectAll: () => alert('Deselect all clicked'),
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'bottom',
  },
};

// With loading action
export const WithLoadingAction: Story = {
  args: {
    selectedCount: 3,
    itemType: 'items',
    actions: [
      createPublishAction(() => {}, true),
      createDeleteAction(() => alert('Delete clicked')),
    ],
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'bottom',
  },
};

// Custom actions
export const CustomActions: Story = {
  args: {
    selectedCount: 8,
    totalCount: 50,
    itemType: 'flashcards',
    actions: [
      {
        id: 'tag',
        label: 'Add Tags',
        icon: Tags,
        variant: 'secondary',
        onClick: () => alert('Add tags clicked'),
      },
      {
        id: 'export',
        label: 'Export',
        icon: Download,
        variant: 'secondary',
        onClick: () => alert('Export clicked'),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        onClick: () => alert('Delete clicked'),
      },
    ],
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'bottom',
  },
};

// Top position
export const TopPosition: Story = {
  args: {
    selectedCount: 12,
    itemType: 'modules',
    actions: [
      createPublishAction(() => alert('Publish clicked')),
      createDeleteAction(() => alert('Delete clicked')),
    ],
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'top',
  },
};

// Minimal (no select all)
export const Minimal: Story = {
  args: {
    selectedCount: 2,
    itemType: 'items',
    actions: [
      createDeleteAction(() => alert('Delete clicked')),
    ],
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'bottom',
  },
};

// Single item selected
export const SingleItem: Story = {
  args: {
    selectedCount: 1,
    itemType: 'concept',
    actions: [
      createDuplicateAction(() => alert('Duplicate clicked')),
      createDeleteAction(() => alert('Delete clicked')),
    ],
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'bottom',
  },
};

// Many items
export const ManyItems: Story = {
  args: {
    selectedCount: 150,
    totalCount: 500,
    itemType: 'items',
    actions: [
      createPublishAction(() => alert('Publish clicked')),
      createExportAction(() => alert('Export clicked')),
      createDeleteAction(() => alert('Delete clicked')),
    ],
    onSelectAll: () => alert('Select all clicked'),
    onClearSelection: () => alert('Clear selection clicked'),
    fixed: false,
    position: 'bottom',
  },
};





