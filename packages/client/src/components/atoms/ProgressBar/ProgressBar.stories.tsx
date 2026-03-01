import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Atoms/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    variant: {
      control: 'select',
      options: ['linear', 'circular', 'stepped'],
    },
    color: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger'],
    },
    showPercentage: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {
  args: {
    value: 50,
  },
};

export const WithLabel: Story = {
  args: {
    value: 75,
    label: 'Progress',
    showPercentage: true,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-8 w-full max-w-md">
      <div>
        <h3 className="text-sm font-medium mb-2">Linear</h3>
        <ProgressBar value={60} variant="linear" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Circular</h3>
        <div className="flex gap-4">
          <ProgressBar value={60} variant="circular" size="sm" showPercentage />
          <ProgressBar value={60} variant="circular" size="md" showPercentage />
          <ProgressBar value={60} variant="circular" size="lg" showPercentage />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Stepped</h3>
        <ProgressBar value={60} variant="stepped" steps={5} />
      </div>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <ProgressBar value={75} color="primary" label="Primary" showPercentage />
      <ProgressBar value={75} color="success" label="Success" showPercentage />
      <ProgressBar value={75} color="warning" label="Warning" showPercentage />
      <ProgressBar value={75} color="danger" label="Danger" showPercentage />
    </div>
  ),
};

export const ProgressLevels: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <ProgressBar value={10} label="Beginning (10%)" color="danger" showPercentage />
      <ProgressBar value={35} label="Progressing (35%)" color="warning" showPercentage />
      <ProgressBar value={65} label="Advancing (65%)" color="primary" showPercentage />
      <ProgressBar value={90} label="Nearing Completion (90%)" color="success" showPercentage />
      <ProgressBar value={100} label="Completed (100%)" color="success" showPercentage />
    </div>
  ),
};

export const SteppedVariations: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <ProgressBar value={40} variant="stepped" steps={5} label="5 Steps" />
      <ProgressBar value={60} variant="stepped" steps={10} label="10 Steps" />
      <ProgressBar value={75} variant="stepped" steps={4} label="4 Steps" />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 w-full max-w-md">
      <div>
        <h3 className="text-sm font-medium mb-4">Linear Progress Bars</h3>
        <div className="space-y-3">
          <ProgressBar value={25} label="25%" showPercentage />
          <ProgressBar value={50} label="50%" showPercentage />
          <ProgressBar value={75} label="75%" showPercentage />
          <ProgressBar value={100} label="100%" showPercentage color="success" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-4">Circular Progress</h3>
        <div className="flex gap-6">
          <ProgressBar value={33} variant="circular" size="md" showPercentage />
          <ProgressBar value={66} variant="circular" size="md" showPercentage />
          <ProgressBar value={100} variant="circular" size="md" showPercentage color="success" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-4">Stepped Progress</h3>
        <div className="space-y-3">
          <ProgressBar value={40} variant="stepped" steps={5} label="Step 2 of 5" />
          <ProgressBar value={80} variant="stepped" steps={5} label="Step 4 of 5" />
        </div>
      </div>
    </div>
  ),
};

