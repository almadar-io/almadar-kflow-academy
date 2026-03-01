import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Avatar } from './Avatar';
import { User, Mail, Settings } from 'lucide-react';

const meta: Meta<typeof Avatar> = {
  title: 'Atoms/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    status: {
      control: 'select',
      options: ['online', 'offline', 'away', 'busy', undefined],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {},
};

export const WithInitials: Story = {
  args: {
    initials: 'JD',
  },
};

export const WithIcon: Story = {
  args: {
    icon: User,
  },
};

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=1',
    alt: 'User avatar',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar initials="XS" size="xs" />
      <Avatar initials="SM" size="sm" />
      <Avatar initials="MD" size="md" />
      <Avatar initials="LG" size="lg" />
      <Avatar initials="XL" size="xl" />
    </div>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar initials="ON" status="online" />
      <Avatar initials="OF" status="offline" />
      <Avatar initials="AW" status="away" />
      <Avatar initials="BU" status="busy" />
    </div>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar initials="JD" badge={3} />
      <Avatar initials="SM" badge={99} />
      <Avatar initials="XL" badge="!" />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar />
        <Avatar initials="JD" />
        <Avatar icon={User} />
        <Avatar icon={Mail} />
        <Avatar icon={Settings} />
      </div>
      <div className="flex items-center gap-4">
        <Avatar initials="AB" status="online" />
        <Avatar initials="CD" status="offline" />
        <Avatar initials="EF" status="away" />
        <Avatar initials="GH" status="busy" />
      </div>
      <div className="flex items-center gap-4">
        <Avatar initials="JD" badge={5} />
        <Avatar initials="SM" badge={99} status="online" />
        <Avatar icon={User} badge="!" status="busy" />
      </div>
    </div>
  ),
};

