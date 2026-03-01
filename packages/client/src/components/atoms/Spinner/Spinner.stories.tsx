import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Atoms/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['circular', 'dots', 'pulse'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    color: {
      control: 'select',
      options: ['primary', 'white', 'gray'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {},
};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <Spinner variant="circular" />
        <p className="text-xs mt-2">Circular</p>
      </div>
      <div className="text-center">
        <Spinner variant="dots" />
        <p className="text-xs mt-2">Dots</p>
      </div>
      <div className="text-center">
        <Spinner variant="pulse" />
        <p className="text-xs mt-2">Pulse</p>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <Spinner size="xs" />
        <p className="text-xs mt-2">XS</p>
      </div>
      <div className="text-center">
        <Spinner size="sm" />
        <p className="text-xs mt-2">SM</p>
      </div>
      <div className="text-center">
        <Spinner size="md" />
        <p className="text-xs mt-2">MD</p>
      </div>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-xs mt-2">LG</p>
      </div>
      <div className="text-center">
        <Spinner size="xl" />
        <p className="text-xs mt-2">XL</p>
      </div>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-6 bg-gray-800 p-4 rounded">
      <div className="text-center">
        <Spinner color="primary" />
        <p className="text-xs mt-2 text-white">Primary</p>
      </div>
      <div className="text-center">
        <Spinner color="white" />
        <p className="text-xs mt-2 text-white">White</p>
      </div>
      <div className="text-center">
        <Spinner color="gray" />
        <p className="text-xs mt-2 text-white">Gray</p>
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium mb-4">Circular</h3>
        <div className="flex items-center gap-4">
          <Spinner variant="circular" size="xs" />
          <Spinner variant="circular" size="sm" />
          <Spinner variant="circular" size="md" />
          <Spinner variant="circular" size="lg" />
          <Spinner variant="circular" size="xl" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-4">Dots</h3>
        <div className="flex items-center gap-4">
          <Spinner variant="dots" size="xs" />
          <Spinner variant="dots" size="sm" />
          <Spinner variant="dots" size="md" />
          <Spinner variant="dots" size="lg" />
          <Spinner variant="dots" size="xl" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-4">Pulse</h3>
        <div className="flex items-center gap-4">
          <Spinner variant="pulse" size="xs" />
          <Spinner variant="pulse" size="sm" />
          <Spinner variant="pulse" size="md" />
          <Spinner variant="pulse" size="lg" />
          <Spinner variant="pulse" size="xl" />
        </div>
      </div>
    </div>
  ),
};

