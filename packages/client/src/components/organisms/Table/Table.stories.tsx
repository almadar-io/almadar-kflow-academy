import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Table } from './Table';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';

const meta: Meta<typeof Table> = {
  title: 'Organisms/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Table>;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

const sampleData: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'inactive' },
  { id: '4', name: 'Alice Williams', email: 'alice@example.com', role: 'Moderator', status: 'active' },
];

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (value: string) => (
      <Badge variant={value === 'active' ? 'success' : 'default'}>
        {value}
      </Badge>
    ),
  },
];

export const Default: Story = {
  args: {
    columns,
    data: sampleData,
    getRowKey: (row: User) => row.id,
  },
};

export const Selectable: Story = {
  args: {
    columns,
    data: sampleData,
    getRowKey: (row: User) => row.id,
    selectable: true,
    selectedRows: ['1'],
    onSelectionChange: (keys: string[]) => console.log('Selected:', keys),
  },
};

export const Sortable: Story = {
  args: {
    columns,
    data: sampleData,
    getRowKey: (row: User) => row.id,
    sortable: true,
    sortColumn: 'name',
    sortDirection: 'asc' as const,
    onSortChange: (col: string, dir: any) => console.log('Sort:', col, dir),
  },
};

export const WithSearch: Story = {
  args: {
    columns,
    data: sampleData,
    getRowKey: (row: User) => row.id,
    searchable: true,
    searchPlaceholder: 'Search users...',
  },
};

export const WithPagination: Story = {
  args: {
    columns,
    data: sampleData,
    getRowKey: (row: User) => row.id,
    paginated: true,
    currentPage: 1,
    totalPages: 3,
    onPageChange: (page: number) => console.log('Page:', page),
  },
};

export const WithActions: Story = {
  args: {
    columns,
    data: sampleData,
    getRowKey: (row: User) => row.id,
    rowActions: (row: User) => [
      { id: 'edit', label: 'Edit', onClick: () => alert(`Edit ${row.name}`) },
      { id: 'delete', label: 'Delete', onClick: () => alert(`Delete ${row.name}`) },
    ],
  },
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    getRowKey: (row: User) => row.id,
    emptyMessage: 'No users found',
  },
};

export const Loading: Story = {
  args: {
    columns,
    data: sampleData,
    getRowKey: (row: User) => row.id,
    loading: true,
  },
};
