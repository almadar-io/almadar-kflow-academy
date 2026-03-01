import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Breadcrumb } from './Breadcrumb';
import { Home, Folder, File } from 'lucide-react';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Molecules/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Documents', href: '/documents' },
      { label: 'Current Page', isCurrent: true },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Folder', href: '/folder', icon: Folder },
      { label: 'File', isCurrent: true, icon: File },
    ],
  },
};

export const LongPath: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Level 1', href: '/level1' },
      { label: 'Level 2', href: '/level1/level2' },
      { label: 'Level 3', href: '/level1/level2/level3' },
      { label: 'Current', isCurrent: true },
    ],
    maxItems: 3,
  },
};

export const WithClickHandlers: Story = {
  args: {
    items: [
      { label: 'Home', onClick: () => alert('Home clicked') },
      { label: 'Documents', onClick: () => alert('Documents clicked') },
      { label: 'Current Page', isCurrent: true },
    ],
  },
};
