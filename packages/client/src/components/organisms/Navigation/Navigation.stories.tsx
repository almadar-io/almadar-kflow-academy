import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Navigation } from './Navigation';
import { Home, Book, Settings, User } from 'lucide-react';

const meta: Meta<typeof Navigation> = {
  title: 'Organisms/Navigation',
  component: Navigation,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Navigation>;

const navItems = [
  { id: '1', label: 'Home', icon: Home, isActive: true },
  { id: '2', label: 'Courses', icon: Book },
  { id: '3', label: 'Settings', icon: Settings },
  { id: '4', label: 'Profile', icon: User },
];

export const Horizontal: Story = {
  args: {
    items: navItems,
    orientation: 'horizontal',
  },
};

export const Vertical: Story = {
  args: {
    items: navItems,
    orientation: 'vertical',
  },
};

export const WithBadges: Story = {
  args: {
    items: [
      ...navItems,
      { id: '5', label: 'Notifications', badge: 5 },
    ],
    orientation: 'horizontal',
  },
};

export const WithSubMenu: Story = {
  args: {
    items: [
      { id: '1', label: 'Home', icon: Home, isActive: true },
      {
        id: '2',
        label: 'Courses',
        icon: Book,
        subMenu: [
          { id: '2-1', label: 'All Courses' },
          { id: '2-2', label: 'My Courses' },
          { id: '2-3', label: 'Favorites' },
        ],
      },
      { id: '3', label: 'Settings', icon: Settings },
    ],
    orientation: 'horizontal',
  },
};

export const WithDisabled: Story = {
  args: {
    items: [
      ...navItems,
      { id: '5', label: 'Disabled', disabled: true },
    ],
    orientation: 'horizontal',
  },
};
