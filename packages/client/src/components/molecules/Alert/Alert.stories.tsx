import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Alert } from './Alert';
import { Button } from '../../atoms/Button';

const meta: Meta<typeof Alert> = {
  title: 'Molecules/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
    dismissible: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'This is an info alert message.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Operation completed successfully!',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Please review this warning message.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'An error occurred. Please try again.',
  },
};

export const WithTitle: Story = {
  args: {
    variant: 'info',
    title: 'Alert Title',
    children: 'This alert has a title and message content.',
  },
};

export const Dismissible: Story = {
  args: {
    variant: 'info',
    children: 'This alert can be dismissed.',
    dismissible: true,
    onDismiss: () => alert('Dismissed!'),
  },
};

export const WithActions: Story = {
  args: {
    variant: 'warning',
    title: 'Confirm Action',
    children: 'Are you sure you want to proceed?',
    actions: (
      <>
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Confirm</Button>
      </>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Alert variant="info" title="Info">This is an informational message.</Alert>
      <Alert variant="success" title="Success">Operation completed successfully!</Alert>
      <Alert variant="warning" title="Warning">Please review this warning.</Alert>
      <Alert variant="error" title="Error">An error occurred.</Alert>
    </div>
  ),
};
