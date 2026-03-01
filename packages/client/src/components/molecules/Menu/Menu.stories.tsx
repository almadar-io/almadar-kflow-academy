import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Menu } from './Menu';
import { Button } from '../../atoms/Button';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';

const meta: Meta<typeof Menu> = {
  title: 'Molecules/Menu',
  component: Menu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Menu>;

const menuItems = [
  { id: '1', label: 'Profile', icon: User, onClick: () => alert('Profile clicked') },
  { id: '2', label: 'Settings', icon: Settings, onClick: () => alert('Settings clicked') },
  { id: 'divider', label: '', onClick: () => {} },
  { id: '3', label: 'Logout', icon: LogOut, onClick: () => alert('Logout clicked') },
];

export const Default: Story = {
  args: {
    trigger: <Button iconRight={ChevronDown}>Menu</Button>,
    items: menuItems,
  },
};

export const WithBadges: Story = {
  args: {
    trigger: <Button iconRight={ChevronDown}>Notifications</Button>,
    items: [
      { id: '1', label: 'Messages', badge: 5, onClick: () => {} },
      { id: '2', label: 'Alerts', badge: 12, onClick: () => {} },
      { id: '3', label: 'Updates', onClick: () => {} },
    ],
  },
};

export const WithSubMenu: Story = {
  args: {
    trigger: <Button iconRight={ChevronDown}>Options</Button>,
    items: [
      {
        id: '1',
        label: 'Settings',
        icon: Settings,
        subMenu: [
          { id: '1-1', label: 'Account', onClick: () => {} },
          { id: '1-2', label: 'Privacy', onClick: () => {} },
          { id: '1-3', label: 'Security', onClick: () => {} },
        ],
      },
      { id: '2', label: 'Help', onClick: () => {} },
    ],
  },
};

export const DifferentPositions: Story = {
  render: () => (
    <div className="flex gap-4">
      <Menu
        trigger={<Button>Top Left</Button>}
        items={menuItems}
        position="top-left"
      />
      <Menu
        trigger={<Button>Top Right</Button>}
        items={menuItems}
        position="top-right"
      />
      <Menu
        trigger={<Button>Bottom Left</Button>}
        items={menuItems}
        position="bottom-left"
      />
      <Menu
        trigger={<Button>Bottom Right</Button>}
        items={menuItems}
        position="bottom-right"
      />
    </div>
  ),
};
