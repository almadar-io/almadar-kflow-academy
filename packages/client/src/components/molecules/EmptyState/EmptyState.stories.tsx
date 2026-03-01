import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { EmptyState } from './EmptyState';
import { Inbox, Search, FileX } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: Inbox,
    title: 'No items found',
    description: 'Get started by creating your first item.',
    actionLabel: 'Create Item',
    onAction: () => alert('Action clicked'),
  },
};

export const NoAction: Story = {
  args: {
    icon: Search,
    title: 'No results',
    description: 'Try adjusting your search criteria.',
  },
};

export const CustomContent: Story = {
  args: {
    icon: FileX,
    title: 'No files',
    description: 'Upload your first file to get started.',
    children: (
      <div className="mt-4 text-sm text-gray-500">
        Supported formats: PDF, DOC, TXT
      </div>
    ),
    actionLabel: 'Upload File',
    onAction: () => alert('Upload clicked'),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Create your first item to get started."
        actionLabel="Create Item"
        onAction={() => {}}
      />
      <EmptyState
        icon={Search}
        title="No results"
        description="Try a different search term."
      />
      <EmptyState
        icon={FileX}
        title="No files"
        description="Upload files to see them here."
        actionLabel="Upload"
        onAction={() => {}}
      />
    </div>
  ),
};
