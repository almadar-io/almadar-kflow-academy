import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Dialog } from './Dialog';
import { useState } from 'react';
import { AlertTriangle, Info as InfoIcon } from 'lucide-react';

const meta: Meta<typeof Dialog> = {
  title: 'Molecules/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

const DialogWrapper = (args: Story['args']) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded">
        Open Dialog
      </button>
      <Dialog {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export const Confirm: Story = {
  render: (args: Story['args']) => <DialogWrapper {...args} />,
  args: {
    variant: 'confirm',
    message: 'Are you sure you want to delete this item?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmVariant: 'danger',
  },
};

export const Alert: Story = {
  render: (args: Story['args']) => <DialogWrapper {...args} />,
  args: {
    variant: 'alert',
    title: 'Alert',
    message: 'This is an alert dialog message.',
    confirmLabel: 'OK',
    showCancel: false,
  },
};

export const WithIcon: Story = {
  render: (args: Story['args']) => <DialogWrapper {...args} />,
  args: {
    variant: 'warning',
    icon: AlertTriangle,
    title: 'Warning',
    message: 'This action cannot be undone.',
    confirmLabel: 'Continue',
    cancelLabel: 'Cancel',
    confirmVariant: 'warning',
  },
};

export const Info: Story = {
  render: (args: Story['args']) => <DialogWrapper {...args} />,
  args: {
    variant: 'info',
    icon: InfoIcon,
    title: 'Information',
    message: 'Here is some important information you should know.',
    confirmLabel: 'Got it',
    showCancel: false,
  },
};
