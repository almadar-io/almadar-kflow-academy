import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StatCard } from './StatCard';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';

const meta: Meta<typeof StatCard> = {
  title: 'Molecules/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    label: 'Total Users',
    value: '1,234',
    icon: Users,
  },
};

export const WithChange: Story = {
  args: {
    label: 'Revenue',
    value: '$45,231',
    change: '+12.5%',
    changeType: 'positive',
    icon: DollarSign,
  },
};

export const NegativeChange: Story = {
  args: {
    label: 'Active Users',
    value: '892',
    change: '-5.2%',
    changeType: 'negative',
    icon: Users,
  },
};

export const WithoutIcon: Story = {
  args: {
    label: 'Total Sales',
    value: '$12,345',
    change: '+8.1%',
    changeType: 'positive',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
      <StatCard
        label="Users"
        value="1,234"
        change="+12%"
        changeType="positive"
        icon={Users}
        iconVariant="primary"
      />
      <StatCard
        label="Revenue"
        value="$45K"
        change="-5%"
        changeType="negative"
        icon={DollarSign}
        iconVariant="success"
      />
      <StatCard
        label="Growth"
        value="23.5%"
        change="+2.1%"
        changeType="positive"
        icon={TrendingUp}
        iconVariant="warning"
      />
      <StatCard
        label="Activity"
        value="892"
        icon={Activity}
        iconVariant="info"
      />
    </div>
  ),
};
