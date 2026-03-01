import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Tabs } from './Tabs';
import { Typography } from '../../atoms/Typography';
import { FileText, Settings, User, Bell } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'Molecules/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const tabItems = [
  {
    id: '1',
    label: 'Overview',
    content: <Typography variant="body">This is the overview tab content.</Typography>,
  },
  {
    id: '2',
    label: 'Details',
    content: <Typography variant="body">This is the details tab content.</Typography>,
  },
  {
    id: '3',
    label: 'Settings',
    content: <Typography variant="body">This is the settings tab content.</Typography>,
  },
];

export const Default: Story = {
  args: {
    items: tabItems,
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      {
        id: '1',
        label: 'Documents',
        icon: FileText,
        content: <Typography variant="body">Documents content</Typography>,
      },
      {
        id: '2',
        label: 'Settings',
        icon: Settings,
        content: <Typography variant="body">Settings content</Typography>,
      },
      {
        id: '3',
        label: 'Profile',
        icon: User,
        content: <Typography variant="body">Profile content</Typography>,
      },
    ],
  },
};

export const WithBadges: Story = {
  args: {
    items: [
      {
        id: '1',
        label: 'Inbox',
        badge: 5,
        content: <Typography variant="body">You have 5 new messages.</Typography>,
      },
      {
        id: '2',
        label: 'Notifications',
        badge: 12,
        content: <Typography variant="body">You have 12 notifications.</Typography>,
      },
      {
        id: '3',
        label: 'Archive',
        content: <Typography variant="body">Archived items.</Typography>,
      },
    ],
  },
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-8 w-full max-w-2xl">
      <div>
        <Typography variant="h6" className="mb-4">Default</Typography>
        <Tabs items={tabItems} variant="default" />
      </div>
      <div>
        <Typography variant="h6" className="mb-4">Pills</Typography>
        <Tabs items={tabItems} variant="pills" />
      </div>
      <div>
        <Typography variant="h6" className="mb-4">Underline</Typography>
        <Tabs items={tabItems} variant="underline" />
      </div>
    </div>
  ),
};

export const WithDisabled: Story = {
  args: {
    items: [
      ...tabItems,
      {
        id: '4',
        label: 'Disabled',
        content: <Typography variant="body">This tab is disabled.</Typography>,
        disabled: true,
      },
    ],
  },
};
