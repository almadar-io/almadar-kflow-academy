import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Icon } from './Icon';
import {
  Heart,
  Star,
  Settings,
  User,
  Mail,
  Bell,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const meta: Meta<typeof Icon> = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    animation: {
      control: 'select',
      options: ['none', 'spin', 'pulse'],
    },
    color: {
      control: 'text',
    },
    strokeWidth: {
      control: 'number',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  args: {
    icon: Heart,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Icon icon={Star} size="xs" />
      <Icon icon={Star} size="sm" />
      <Icon icon={Star} size="md" />
      <Icon icon={Star} size="lg" />
      <Icon icon={Star} size="xl" />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Icon icon={Heart} color="text-red-500" />
      <Icon icon={Star} color="text-yellow-500" />
      <Icon icon={Settings} color="text-blue-500" />
      <Icon icon={CheckCircle} color="text-green-500" />
      <Icon icon={AlertCircle} color="text-red-600" />
    </div>
  ),
};

export const Animations: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <Icon icon={Loader2} animation="spin" />
        <p className="text-xs mt-2">Spin</p>
      </div>
      <div className="text-center">
        <Icon icon={Bell} animation="pulse" />
        <p className="text-xs mt-2">Pulse</p>
      </div>
      <div className="text-center">
        <Icon icon={Heart} animation="none" />
        <p className="text-xs mt-2">None</p>
      </div>
    </div>
  ),
};

export const CommonIcons: Story = {
  render: () => (
    <div className="grid grid-cols-5 gap-4">
      <div className="text-center">
        <Icon icon={User} />
        <p className="text-xs mt-2">User</p>
      </div>
      <div className="text-center">
        <Icon icon={Mail} />
        <p className="text-xs mt-2">Mail</p>
      </div>
      <div className="text-center">
        <Icon icon={Bell} />
        <p className="text-xs mt-2">Bell</p>
      </div>
      <div className="text-center">
        <Icon icon={Search} />
        <p className="text-xs mt-2">Search</p>
      </div>
      <div className="text-center">
        <Icon icon={Settings} />
        <p className="text-xs mt-2">Settings</p>
      </div>
      <div className="text-center">
        <Icon icon={Heart} color="text-red-500" />
        <p className="text-xs mt-2">Heart</p>
      </div>
      <div className="text-center">
        <Icon icon={Star} color="text-yellow-500" />
        <p className="text-xs mt-2">Star</p>
      </div>
      <div className="text-center">
        <Icon icon={CheckCircle} color="text-green-500" />
        <p className="text-xs mt-2">Check</p>
      </div>
      <div className="text-center">
        <Icon icon={AlertCircle} color="text-red-500" />
        <p className="text-xs mt-2">Alert</p>
      </div>
      <div className="text-center">
        <Icon icon={Loader2} animation="spin" />
        <p className="text-xs mt-2">Loading</p>
      </div>
    </div>
  ),
};

export const WithCustomStroke: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Icon icon={Heart} strokeWidth={1} />
      <Icon icon={Heart} strokeWidth={2} />
      <Icon icon={Heart} strokeWidth={3} />
    </div>
  ),
};

