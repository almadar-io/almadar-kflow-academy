import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { useState } from 'react';
import { Badge } from './Badge';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    dismissible: {
      control: 'boolean',
    },
    dot: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge icon={CheckCircle} variant="success">Completed</Badge>
      <Badge icon={AlertCircle} variant="warning">Warning</Badge>
      <Badge icon={Info} variant="info">Information</Badge>
      <Badge icon={XCircle} variant="danger">Error</Badge>
    </div>
  ),
};

export const Dismissible: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    if (!visible) return <button onClick={() => setVisible(true)}>Show Badge</button>;
    return (
      <Badge dismissible onDismiss={() => setVisible(false)}>
        Click X to dismiss
      </Badge>
    );
  },
};

export const Dot: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge dot variant="default" />
      <Badge dot variant="primary" />
      <Badge dot variant="success" />
      <Badge dot variant="warning" />
      <Badge dot variant="danger" />
      <Badge dot variant="info" />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Badge>Default</Badge>
        <Badge variant="primary">Primary</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="info">Info</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Badge icon={CheckCircle} variant="success">With Icon</Badge>
        <Badge dismissible onDismiss={() => {}}>Dismissible</Badge>
        <Badge dot variant="primary" />
      </div>
    </div>
  ),
};

