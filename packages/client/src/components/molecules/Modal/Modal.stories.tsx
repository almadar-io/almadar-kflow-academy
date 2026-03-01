import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Modal } from './Modal';
import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';

const meta: Meta<typeof Modal> = {
  title: 'Molecules/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalWrapper = (args: Story['args']) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export const Default: Story = {
  render: (args: Story['args']) => <ModalWrapper {...args} />,
  args: {
    title: 'Modal Title',
    children: (
      <Typography variant="body">
        This is the modal content. It can contain any React elements.
      </Typography>
    ),
  },
};

export const WithFooter: Story = {
  render: (args: Story['args']) => <ModalWrapper {...args} />,
  args: {
    title: 'Confirm Action',
    children: (
      <Typography variant="body">
        Are you sure you want to proceed with this action?
      </Typography>
    ),
    footer: (
      <>
        <Button variant="secondary" onClick={() => {}}>Cancel</Button>
        <Button variant="primary" onClick={() => {}}>Confirm</Button>
      </>
    ),
  },
};

export const Sizes: Story = {
  render: () => {
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <div className="flex gap-2 mb-4">
          <Button onClick={() => { setSize('sm'); setIsOpen(true); }}>Small</Button>
          <Button onClick={() => { setSize('md'); setIsOpen(true); }}>Medium</Button>
          <Button onClick={() => { setSize('lg'); setIsOpen(true); }}>Large</Button>
          <Button onClick={() => { setSize('xl'); setIsOpen(true); }}>Extra Large</Button>
        </div>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={`${size.toUpperCase()} Modal`}
          size={size}
        >
          <Typography variant="body">
            This is a {size} sized modal.
          </Typography>
        </Modal>
      </>
    );
  },
};

export const WithoutTitle: Story = {
  render: (args: Story['args']) => <ModalWrapper {...args} />,
  args: {
    children: (
      <Typography variant="body">
        This modal has no title.
      </Typography>
    ),
    showCloseButton: true,
  },
};

export const ScrollableContent: Story = {
  render: (args: Story['args']) => <ModalWrapper {...args} />,
  args: {
    title: 'Long Content',
    children: (
      <div>
        {Array.from({ length: 20 }).map((_, i) => (
          <Typography key={i} variant="body" className="mb-4">
            Paragraph {i + 1}: This is some content to demonstrate scrolling in the modal.
          </Typography>
        ))}
      </div>
    ),
  },
};
