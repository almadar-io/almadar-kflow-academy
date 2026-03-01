import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Divider } from './Divider';

const meta: Meta<typeof Divider> = {
  title: 'Atoms/Divider',
  component: Divider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    label: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Default: Story = {
  args: {},
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: (args: typeof Vertical.args) => (
    <div className="flex items-center gap-4 h-20">
      <span>Left</span>
      <Divider {...args} />
      <span>Right</span>
    </div>
  ),
};

export const WithLabel: Story = {
  args: {
    label: 'Or',
  },
};

export const WithDifferentLabels: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Divider label="Section 1" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Content above divider
      </p>
      <Divider label="Section 2" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Content below divider
      </p>
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Section Title</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This is some content in the first section.
        </p>
      </div>
      <Divider />
      <div>
        <h3 className="text-lg font-semibold mb-2">Another Section</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This is content in the second section, separated by a divider.
        </p>
      </div>
      <Divider label="Or continue with" />
      <div>
        <h3 className="text-lg font-semibold mb-2">Final Section</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This section has a labeled divider above it.
        </p>
      </div>
    </div>
  ),
};

export const VerticalInContext: Story = {
  render: () => (
    <div className="flex items-center gap-4 h-32">
      <div className="flex-1">
        <h4 className="font-semibold mb-1">Left Content</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Content on the left side
        </p>
      </div>
      <Divider orientation="vertical" />
      <div className="flex-1">
        <h4 className="font-semibold mb-1">Right Content</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Content on the right side
        </p>
      </div>
    </div>
  ),
};

