import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { List } from './List';
import { User, Mail, Phone } from 'lucide-react';
import { Badge } from '../../atoms/Badge';

const meta: Meta<typeof List> = {
  title: 'Organisms/List',
  component: List,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof List>;

const sampleItems = [
  {
    id: '1',
    title: 'John Doe',
    description: 'Software Engineer',
    avatar: { initials: 'JD' },
    badge: 5,
  },
  {
    id: '2',
    title: 'Jane Smith',
    description: 'Product Designer',
    avatar: { initials: 'JS' },
  },
  {
    id: '3',
    title: 'Bob Johnson',
    description: 'Marketing Manager',
    avatar: { initials: 'BJ' },
    badge: 2,
  },
];

export const Default: Story = {
  args: {
    items: sampleItems,
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      { id: '1', title: 'Email', description: 'contact@example.com', icon: Mail },
      { id: '2', title: 'Phone', description: '+1 234 567 8900', icon: Phone },
      { id: '3', title: 'User', description: 'John Doe', icon: User },
    ],
  },
};

export const Selectable: Story = {
  args: {
    items: sampleItems,
    selectable: true,
    selectedItems: ['1'],
    onSelectionChange: (ids: string[]) => console.log('Selected:', ids),
  },
};

export const CardVariant: Story = {
  args: {
    items: sampleItems,
    variant: 'card',
    showDividers: false,
  },
};

export const WithActions: Story = {
  args: {
    items: sampleItems,
    itemActions: (item: any) => [
      { id: 'edit', label: 'Edit', onClick: () => alert(`Edit ${item.title}`) },
      { id: 'delete', label: 'Delete', onClick: () => alert(`Delete ${item.title}`) },
    ],
  },
};

export const WithMetadata: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'Project Alpha',
        description: 'Active project',
        metadata: (
          <div className="flex gap-2 mt-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="info">3 members</Badge>
          </div>
        ),
      },
      {
        id: '2',
        title: 'Project Beta',
        description: 'In progress',
        metadata: (
          <div className="flex gap-2 mt-2">
            <Badge variant="warning">In Progress</Badge>
            <Badge variant="info">5 members</Badge>
          </div>
        ),
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    items: [],
    emptyMessage: 'No items to display',
  },
};
