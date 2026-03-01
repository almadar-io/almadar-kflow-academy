import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Toast } from './Toast';
import { useState } from 'react';
import { Button } from '../../atoms/Button';

const meta: Meta<typeof Toast> = {
  title: 'Molecules/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Toast>;

const ToastWrapper = (args: Story['args']) => {
  const [show, setShow] = useState(true);
  return show ? (
    <Toast {...args} onDismiss={() => setShow(false)} />
  ) : (
    <Button onClick={() => setShow(true)}>Show Toast</Button>
  );
};

export const Info: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'info',
    message: 'This is an informational message.',
  },
};

export const Success: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'success',
    message: 'Operation completed successfully!',
  },
};

export const Warning: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'warning',
    message: 'Please review this warning.',
  },
};

export const Error: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'error',
    message: 'An error occurred. Please try again.',
  },
};

export const WithTitle: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'success',
    title: 'Success',
    message: 'Your changes have been saved.',
  },
};

export const WithAction: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'info',
    message: 'New update available.',
    actionLabel: 'Update',
    onAction: () => alert('Update clicked'),
  },
};

export const WithBadge: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'info',
    message: 'You have new notifications.',
    badge: 5,
  },
};

export const AutoDismiss: Story = {
  render: (args: Story['args']) => <ToastWrapper {...args} />,
  args: {
    variant: 'success',
    message: 'This toast will auto-dismiss in 3 seconds.',
    duration: 3000,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Toast variant="info" message="Info message" onDismiss={() => {}} />
      <Toast variant="success" message="Success message" onDismiss={() => {}} />
      <Toast variant="warning" message="Warning message" onDismiss={() => {}} />
      <Toast variant="error" message="Error message" onDismiss={() => {}} />
    </div>
  ),
};
