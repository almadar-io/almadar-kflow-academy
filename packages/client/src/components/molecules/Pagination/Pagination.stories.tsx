import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Pagination } from './Pagination';
import { useState } from 'react';

const meta: Meta<typeof Pagination> = {
  title: 'Molecules/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

const PaginationWrapper = (args: Story['args']) => {
  const [page, setPage] = useState(args.currentPage || 1);
  return (
    <Pagination
      {...args}
      currentPage={page}
      onPageChange={setPage}
    />
  );
};

export const Default: Story = {
  render: (args: Story['args']) => <PaginationWrapper {...args} />,
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: () => {},
  },
};

export const WithPageSize: Story = {
  render: (args: Story['args']) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    return (
      <Pagination
        {...args}
        currentPage={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    );
  },
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: () => {},
    showPageSize: true,
    pageSize: 20,
    onPageSizeChange: () => {},
  },
};

export const WithJumpToPage: Story = {
  render: (args: Story['args']) => <PaginationWrapper {...args} />,
  args: {
    currentPage: 5,
    totalPages: 20,
    onPageChange: () => {},
    showJumpToPage: true,
  },
};

export const WithTotal: Story = {
  render: (args: Story['args']) => <PaginationWrapper {...args} />,
  args: {
    currentPage: 3,
    totalPages: 10,
    onPageChange: () => {},
    showTotal: true,
    totalItems: 250,
  },
};

export const ManyPages: Story = {
  render: (args: Story['args']) => <PaginationWrapper {...args} />,
  args: {
    currentPage: 15,
    totalPages: 50,
    onPageChange: () => {},
    maxVisiblePages: 7,
  },
};
