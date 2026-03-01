import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { SearchInput } from './SearchInput';
import { useState } from 'react';

const meta: Meta<typeof SearchInput> = {
  title: 'Molecules/SearchInput',
  component: SearchInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
  args: {
    placeholder: 'Search...',
    onSearch: (value: string) => console.log('Search:', value),
  },
};

export const WithValue: Story = {
  args: {
    value: 'Initial search',
    placeholder: 'Search...',
    onSearch: (value: string) => console.log('Search:', value),
  },
};

export const Loading: Story = {
  args: {
    placeholder: 'Searching...',
    loading: true,
    onSearch: (value: string) => console.log('Search:', value),
  },
};

export const WithDebounce: Story = {
  args: {
    placeholder: 'Search with debounce...',
    debounceMs: 500,
    onSearch: (value: string) => console.log('Debounced search:', value),
  },
};

export const NotClearable: Story = {
  args: {
    placeholder: 'Search (no clear button)...',
    clearable: false,
    onSearch: (value: string) => console.log('Search:', value),
  },
};

export const AllStates: Story = {
  render: () => {
    const [loading, setLoading] = useState(false);
    return (
      <div className="space-y-4 w-full max-w-md">
        <SearchInput
          placeholder="Normal state"
          onSearch={(value: string) => console.log('Search:', value)}
        />
        <SearchInput
          placeholder="Loading state"
          loading={true}
          onSearch={(value: string) => console.log('Search:', value)}
        />
        <SearchInput
          placeholder="With value"
          value="Sample search"
          onSearch={(value: string) => console.log('Search:', value)}
        />
      </div>
    );
  },
};
